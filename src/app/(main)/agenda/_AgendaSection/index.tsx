'use client';

import FullCalendar from '@fullcalendar/react';
import ptBr from '@fullcalendar/core/locales/pt-br';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { useEffect, useRef, useState } from 'react';

import LabelPlus from '@/components/LabelPlus';
import ModalNovoCompromisso from '@/components/ModalNovoCompromisso';
import { AtendenteAgenda, ClientResponse, CompromissoResponse, ContactResponse } from '@/Interfaces';
import { usePermissoes } from '@/hooks/usePermissoes';
import useApi from '@/service/Api/ApiClient';
import { Alerta, CatchAlerta, corDoTextoSobre } from '@/service/Util';

type Formulario = {
  id?: number;
  titulo: string;
  observacao: string;
  inicio_em: string;
  fim_em: string;
  lembrete_minutos: 5 | 10 | 15 | 20 | 25 | 30 | 60;
  user_id?: number;
  client_id: number | null;
  contact_id: number | null;
};

const VISOES = [
  { label: 'Dia', value: 'timeGridDay' },
  { label: 'Semana', value: 'timeGridWeek' },
  { label: 'Mês', value: 'dayGridMonth' },
  { label: 'Programação', value: 'listWeek' },
];
const LEMBRETES = [
  { label: '5 minutos antes', value: 5 },
  { label: '10 minutos antes', value: 10 },
  { label: '15 minutos antes', value: 15 },
  { label: '20 minutos antes', value: 20 },
  { label: '25 minutos antes', value: 25 },
  { label: '30 minutos antes', value: 30 },
  { label: '1 hora antes', value: 60 },
];

const paraCampoData = (data: Date | string) => {
  const valor = new Date(data);
  valor.setMinutes(valor.getMinutes() - valor.getTimezoneOffset());
  return valor.toISOString().slice(0, 16);
};

const formularioVazio = (inicio = new Date(), fim = new Date(inicio.getTime() + 60 * 60 * 1000)): Formulario => ({
  titulo: '', observacao: '', inicio_em: paraCampoData(inicio), fim_em: paraCampoData(fim),
  lembrete_minutos: 30, client_id: null, contact_id: null,
});

const tituloDoPeriodo = (inicio: Date, fim: Date) => {
  const meio = new Date((inicio.getTime() + fim.getTime()) / 2);
  const titulo = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(meio);
  return titulo.charAt(0).toUpperCase() + titulo.slice(1);
};

const cabecalhoDia = (data: Date, visaoAtual: string) => {
  const semana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(data).replace('.', '');
  if (visaoAtual === 'dayGridMonth') return `<span class="agenda-dia-semana">${semana}</span>`;

  const numero = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(data);
  const hoje = new Date();
  const ehHoje = data.toDateString() === hoje.toDateString();

  return `<span class="agenda-cabecalho-dia"><span class="agenda-dia-semana">${semana}</span><span class="agenda-dia-numero${ehHoje ? ' agenda-dia-hoje' : ''}">${numero}</span></span>`;
};

export default function AgendaSection() {
  const calendario = useRef<FullCalendar>(null);
  const cardAgenda = useRef<HTMLDivElement>(null);
  const modoCompacto = useRef<boolean | null>(null);
  const periodoAtual = useRef<{ inicio: string; fim: string } | null>(null);
  const { FetchReq } = useApi();
  const { pode, carregado } = usePermissoes();
  const [compromissos, setCompromissos] = useState<CompromissoResponse[]>([]);
  const [atendentes, setAtendentes] = useState<AtendenteAgenda[]>([]);
  const [clientes, setClientes] = useState<ClientResponse[]>([]);
  const [contatos, setContatos] = useState<ContactResponse[]>([]);
  const [visao, setVisao] = useState('timeGridWeek');
  const [tituloAtual, setTituloAtual] = useState('');
  const [formulario, setFormulario] = useState<Formulario>(formularioVazio());
  const [modalAberto, setModalAberto] = useState(false);
  const [novoCompromisso, setNovoCompromisso] = useState<{ inicio?: Date; fim?: Date } | null>(null);
  const [conflitoPendente, setConflitoPendente] = useState(false);

  const podeCriar = pode('schedule:add');
  const podeEditar = pode('schedule:edit');
  const podeExcluir = pode('schedule:delete');
  const modoConjunto = atendentes.length > 1;

  const carregar = async (inicio: string, fim: string) => {
    try {
      const dados = await FetchReq<CompromissoResponse[]>({ endpoint: 'ListarCompromissos', variables: [inicio, fim] });
      setCompromissos(dados ?? []);
    } catch (erro) { CatchAlerta(erro, 'Não foi possível carregar a agenda'); }
  };

  useEffect(() => {
    if (!carregado) return;
    Promise.all([
      FetchReq<AtendenteAgenda[]>('ListarAtendentesAgenda'),
      FetchReq<ClientResponse[]>('ListarClientes').catch(() => []),
      FetchReq<ContactResponse[]>('ListarContatos').catch(() => []),
    ]).then(([listaAtendentes, listaClientes, listaContatos]) => {
      setAtendentes(listaAtendentes ?? []); setClientes(listaClientes ?? []); setContatos(listaContatos ?? []);
    }).catch((erro) => CatchAlerta(erro, 'Não foi possível preparar a agenda'));
  // A carga inicial depende da sessão; `FetchReq` é estável no client da aplicação.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregado]);

  useEffect(() => {
    const ajustarVisaoCompacta = () => {
      // A sidebar pode estreitar a agenda mesmo numa janela larga. Por isso a
      // decisão usa a largura real do card, não `window.innerWidth`.
      const compacto = (cardAgenda.current?.clientWidth ?? window.innerWidth) < 700;
      // Só troca automaticamente ao entrar ou sair do modo compacto. Sem esse
      // guard, o FullCalendar redimensiona o card ao mudar de visão e desfaz a
      // escolha manual do usuário, voltando sempre para Programação.
      if (modoCompacto.current === compacto) return;
      modoCompacto.current = compacto;
      const novaVisao = compacto ? 'listWeek' : 'timeGridWeek';
      setVisao(novaVisao);
      calendario.current?.getApi().changeView(novaVisao);
    };
    const observador = new ResizeObserver(ajustarVisaoCompacta);
    if (cardAgenda.current) observador.observe(cardAgenda.current);
    ajustarVisaoCompacta();
    return () => observador.disconnect();
  }, []);

  const abrirNovo = (inicio?: Date, fim?: Date) => {
    if (!podeCriar) return;
    setNovoCompromisso({ inicio, fim });
  };
  const abrirExistente = (compromisso: CompromissoResponse) => {
    setFormulario({ ...compromisso, inicio_em: paraCampoData(compromisso.inicio_em), fim_em: paraCampoData(compromisso.fim_em) });
    setModalAberto(true);
  };
  const atualizarInicio = (inicio: Date) => {
    const fimAtual = new Date(formulario.fim_em);
    const fim = fimAtual <= inicio ? new Date(inicio.getTime() + 30 * 60 * 1000) : fimAtual;
    setFormulario({ ...formulario, inicio_em: paraCampoData(inicio), fim_em: paraCampoData(fim) });
  };
  const atualizarFim = (fim: Date) => {
    if (fim <= new Date(formulario.inicio_em)) return;
    setFormulario({ ...formulario, fim_em: paraCampoData(fim) });
  };
  const salvar = async (confirmar_conflito = false) => {
    // Enviar somente os campos aceitos pela API evita que o objeto de relação
    // carregado ao editar (responsavel/cliente/contato) interfira no PATCH.
    const corpo = {
      titulo: formulario.titulo,
      observacao: formulario.observacao,
      inicio_em: new Date(formulario.inicio_em).toISOString(),
      fim_em: new Date(formulario.fim_em).toISOString(),
      lembrete_minutos: formulario.lembrete_minutos,
      user_id: formulario.user_id,
      client_id: formulario.client_id,
      contact_id: formulario.contact_id,
      confirmar_conflito,
    };
    try {
      if (formulario.id) await FetchReq({ endpoint: 'AtualizarCompromisso', variables: [formulario.id], body: corpo });
      else await FetchReq({ endpoint: 'CriarCompromisso', body: corpo });
      setConflitoPendente(false); setModalAberto(false); Alerta('Compromisso salvo.', 'Pronto', 'success');
      if (periodoAtual.current) carregar(periodoAtual.current.inicio, periodoAtual.current.fim);
    } catch (erro: any) {
      if (erro?.response?.status === 409 && erro?.response?.data?.requer_confirmacao) setConflitoPendente(true);
      else CatchAlerta(erro, 'Não foi possível salvar o compromisso');
    }
  };
  const remover = async () => {
    if (!formulario.id || !confirm('Remover este compromisso?')) return;
    try { await FetchReq({ endpoint: 'RemoverCompromisso', variables: [formulario.id] }); setModalAberto(false); if (periodoAtual.current) carregar(periodoAtual.current.inicio, periodoAtual.current.fim); }
    catch (erro) { CatchAlerta(erro, 'Não foi possível remover o compromisso'); }
  };

  return <div ref={cardAgenda} className="card shadow-1 mx-auto agenda-card" style={{ maxWidth: '1500px' }}>
    <div className="flex flex-wrap align-items-center justify-content-between gap-2 mb-4 agenda-cabecalho">
      <div className="flex align-items-center gap-3">
        <h2 className="m-0">Agenda</h2>
        <span className="agenda-periodo">{tituloAtual}</span>
      </div>
      <div className="flex align-items-center gap-2 agenda-acoes">
        <Button icon="pi pi-chevron-left" text aria-label="Anterior" onClick={() => calendario.current?.getApi().prev()} />
        <Button label="Hoje" text onClick={() => calendario.current?.getApi().today()} />
        <Button icon="pi pi-chevron-right" text aria-label="Próximo" onClick={() => calendario.current?.getApi().next()} />
        <Dropdown value={visao} options={VISOES} onChange={(e) => { setVisao(e.value); calendario.current?.getApi().changeView(e.value); }} />
        {podeCriar && <Button className="agenda-novo-compromisso" label="Novo compromisso" icon="pi pi-plus" onClick={() => abrirNovo()} />}
      </div>
    </div>
    <div className="agenda-calendario"><FullCalendar ref={calendario} plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]} locales={[ptBr]} initialView="timeGridWeek" headerToolbar={false} height={visao === 'dayGridMonth' ? undefined : 'auto'} aspectRatio={visao === 'dayGridMonth' ? 1.65 : undefined} locale="pt-br" firstDay={1} allDaySlot={false} slotMinTime="00:00:00" slotMaxTime="24:00:00" scrollTime="00:00:00" slotDuration="00:30:00" slotLabelContent={(arg) => { const hora = arg.date.getHours(); return hora === 0 ? '' : `${String(hora).padStart(2, '0')}:00`; }} dayHeaderContent={(arg) => ({ html: cabecalhoDia(arg.date, arg.view.type) })} displayEventTime={visao !== 'timeGridWeek'} selectable={podeCriar} selectMirror events={compromissos.map((c) => ({ id: String(c.id), title: c.titulo, start: c.inicio_em, end: c.fim_em, backgroundColor: c.responsavel?.schedule_color, borderColor: c.responsavel?.schedule_color, textColor: corDoTextoSobre(c.responsavel?.schedule_color), extendedProps: { compromisso: c } }))} select={(info) => abrirNovo(info.start, info.end)} eventClick={(info) => abrirExistente(info.event.extendedProps.compromisso)} datesSet={(info) => { const novo = { inicio: info.start.toISOString(), fim: info.end.toISOString() }; setTituloAtual((atual) => { const titulo = tituloDoPeriodo(info.start, info.end); return atual === titulo ? atual : titulo; }); if (periodoAtual.current?.inicio === novo.inicio && periodoAtual.current.fim === novo.fim) return; periodoAtual.current = novo; carregar(novo.inicio, novo.fim); }} /></div>
    <ModalNovoCompromisso visible={novoCompromisso !== null} inicio={novoCompromisso?.inicio} fim={novoCompromisso?.fim} onHide={() => setNovoCompromisso(null)} onSalvo={() => periodoAtual.current && carregar(periodoAtual.current.inicio, periodoAtual.current.fim)} />
    <Dialog  blockScroll header="Compromisso" visible={modalAberto} onHide={() => { setModalAberto(false); setConflitoPendente(false); }} style={{ width: 'min(95vw, 44rem)' }} footer={<div className="flex justify-content-between"><span>{formulario.id && podeExcluir && <Button label="Excluir" severity="danger" text onClick={remover} />}</span><span className="flex gap-2"><Button label="Cancelar" text onClick={() => setModalAberto(false)} /><Button label="Salvar" disabled={!podeEditar} onClick={() => salvar()} /></span></div>}>
      <div className="grid p-fluid">
        <div className="col-12"><LabelPlus text="Título" required /><InputText value={formulario.titulo} disabled={formulario.id ? !podeEditar : !podeCriar} onChange={(e) => setFormulario({ ...formulario, titulo: e.target.value })} /></div>
        <div className="col-6"><LabelPlus htmlFor="compromisso-inicio" text="Início" required /><Calendar inputId="compromisso-inicio" value={new Date(formulario.inicio_em)} onChange={(e) => e.value instanceof Date && atualizarInicio(e.value)} dateFormat="dd/mm/yy" showTime hourFormat="24" stepMinute={30} showIcon className="w-full" disabled={formulario.id ? !podeEditar : !podeCriar} /></div>
        <div className="col-6"><LabelPlus htmlFor="compromisso-fim" text="Fim" required /><Calendar inputId="compromisso-fim" value={new Date(formulario.fim_em)} minDate={new Date(formulario.inicio_em)} onChange={(e) => e.value instanceof Date && atualizarFim(e.value)} dateFormat="dd/mm/yy" showTime hourFormat="24" stepMinute={30} showIcon className="w-full" disabled={formulario.id ? !podeEditar : !podeCriar} /></div>
        <div className="col-12"><LabelPlus text="Observação" /><InputTextarea value={formulario.observacao} autoResize rows={5} onChange={(e) => setFormulario({ ...formulario, observacao: e.target.value })} /></div>
        <div className="col-6"><LabelPlus text="Lembrete" /><Dropdown value={formulario.lembrete_minutos} options={LEMBRETES} onChange={(e) => setFormulario({ ...formulario, lembrete_minutos: e.value })} /></div>
        {modoConjunto && <div className="col-6"><LabelPlus text="Atendente responsável" /><Dropdown value={formulario.user_id} options={atendentes} optionValue="id" optionLabel="name" dataKey="id" placeholder="Eu" onChange={(e) => setFormulario((atual) => ({ ...atual, user_id: Number(e.value) }))} /></div>}
        <div className="col-6"><LabelPlus text="Cliente (opcional)" /><Dropdown value={formulario.client_id} options={clientes} optionValue="id" optionLabel="nome" showClear filter onChange={(e) => setFormulario({ ...formulario, client_id: e.value ?? null, contact_id: e.value ? null : formulario.contact_id })} /></div>
        <div className="col-6"><LabelPlus text="Contato (opcional)" /><Dropdown value={formulario.contact_id} options={contatos} optionValue="id" optionLabel="name" showClear filter onChange={(e) => setFormulario({ ...formulario, contact_id: e.value ?? null, client_id: e.value ? null : formulario.client_id })} /></div>
      </div>
    </Dialog>
    <Dialog header="Conflito de horário" visible={conflitoPendente} onHide={() => setConflitoPendente(false)} footer={<><Button label="Ajustar" text onClick={() => setConflitoPendente(false)} /><Button label="Salvar mesmo assim" severity="warning" onClick={() => salvar(true)} /></>}><p>Já existe um compromisso deste atendente nesse horário. Deseja mantê-lo mesmo assim?</p></Dialog>
  </div>;
}
