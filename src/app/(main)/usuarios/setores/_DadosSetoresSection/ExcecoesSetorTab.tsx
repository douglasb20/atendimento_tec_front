import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useEffect, useState } from 'react';

import LabelPlus from '@/components/LabelPlus';
import { DepartmentScheduleExceptionResponse, DepartmentScheduleResponse, HolidayResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { Alerta, CatchAlerta, ConfirmaAcao } from '@/service/Util';

type Props = { departmentId: number; ativa: boolean; somenteLeitura: boolean };
type Modo = DepartmentScheduleExceptionResponse['mode'];
const MODOS = [
  { label: 'Fechado', value: 'fechado' },
  { label: 'Usar horário normal', value: 'normal' },
  { label: 'Horário especial', value: 'especial' },
];
const dataLocal = (data: Date) => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
const lerData = (data: string) => { const [ano, mes, dia] = data.split('-').map(Number); return new Date(ano, mes - 1, dia); };

function proximaDataAnual(mes: number, dia: number): Date {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  // Inclui 29/02 sem deslocá-lo acidentalmente para março em anos comuns.
  for (let ano = hoje.getFullYear(); ano <= hoje.getFullYear() + 8; ano++) {
    const data = new Date(ano, mes - 1, dia);
    if (data.getMonth() === mes - 1 && data.getDate() === dia && data >= hoje) return data;
  }
  return hoje;
}

const proximaData = (feriado: HolidayResponse) => feriado.recurring
  ? proximaDataAnual(feriado.month, feriado.day) : new Date(feriado.year, feriado.month - 1, feriado.day);
const rotuloData = (excecao: DepartmentScheduleExceptionResponse) => excecao.recurring
  ? `${excecao.date.slice(8, 10)}/${excecao.date.slice(5, 7)} (todos os anos)`
  : lerData(excecao.date).toLocaleDateString('pt-BR');

export default function ExcecoesSetorTab({ departmentId, ativa, somenteLeitura }: Props) {
  const { FetchReq } = useApi();
  const [excecoes, setExcecoes] = useState<DepartmentScheduleExceptionResponse[]>([]);
  const [feriados, setFeriados] = useState<HolidayResponse[]>([]);
  const [horarioAtivo, setHorarioAtivo] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [id, setId] = useState<number | null>(null);
  const [data, setData] = useState<Date | null>(null);
  const [anual, setAnual] = useState(false);
  const [feriadoId, setFeriadoId] = useState<number | null>(null);
  const [descricao, setDescricao] = useState('');
  const [modo, setModo] = useState<Modo>('fechado');
  const [intervalos, setIntervalos] = useState<{ start_time: string; end_time: string }[]>([]);
  const feriadoSelecionado = feriados.find((feriado) => feriado.id === feriadoId);

  const carregar = async () => {
    try {
      setCarregando(true);
      const [lista, calendario, horario] = await Promise.all([
        FetchReq<DepartmentScheduleExceptionResponse[]>('ListarExcecoesSetor', [departmentId]),
        FetchReq<HolidayResponse[]>('ListarFeriados'),
        FetchReq<DepartmentScheduleResponse>('BuscarHorarioSetor', [departmentId]),
      ]);
      setExcecoes(lista ?? []); setFeriados(calendario ?? []);
      setHorarioAtivo(horario.schedule_enabled); setPronto(true);
    } catch (erro) {
      setPronto(false); CatchAlerta(erro, 'Não foi possível carregar as exceções do setor');
    } finally { setCarregando(false); }
  };

  useEffect(() => {
    if (!ativa) return;
    setEditando(false); setPronto(false); carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativa, departmentId]);

  const abrir = (excecao?: DepartmentScheduleExceptionResponse) => {
    setId(excecao?.id ?? null);
    setAnual(excecao?.recurring ?? false);
    setData(excecao ? excecao.recurring
      ? proximaDataAnual(Number(excecao.date.slice(5, 7)), Number(excecao.date.slice(8, 10)))
      : lerData(excecao.date) : null);
    setFeriadoId(excecao?.holiday_id ?? null); setDescricao(excecao?.description ?? '');
    setModo(excecao?.mode ?? 'fechado'); setIntervalos(excecao?.intervals.map((i) => ({ ...i })) ?? []);
    setEditando(true);
  };

  const salvar = async () => {
    if (!data || !descricao.trim()) { Alerta('Informe a data e a descrição da exceção.', 'Atenção', 'warning'); return; }
    const ordenados = [...intervalos].sort((a, b) => a.start_time.localeCompare(b.start_time));
    if (modo === 'especial' && (!ordenados.length || ordenados.some((i) => !i.start_time.trim() || !i.end_time.trim()))) {
      Alerta('Preencha o início e o fim de cada horário. Os exemplos nos campos não são horários preenchidos.', 'Atenção', 'warning'); return;
    }
    if (modo === 'especial' && (!ordenados.length || ordenados.some((i, indice) =>
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(i.start_time) || !/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/.test(i.end_time) ||
      i.start_time >= i.end_time || indice > 0 && ordenados[indice - 1].end_time > i.start_time))) {
      Alerta('Informe intervalos válidos, com início antes do fim e sem sobreposição.', 'Atenção', 'warning'); return;
    }
    try {
      setSalvando(true);
      await FetchReq({ endpoint: id ? 'AtualizarExcecaoSetor' : 'AdicionarExcecaoSetor',
        variables: id ? [departmentId, id] : [departmentId],
        body: { date: dataLocal(data), recurring: anual, description: descricao.trim(), holiday_id: feriadoId,
          mode: modo, intervals: modo === 'especial' ? ordenados : [] },
      });
      setEditando(false); await carregar(); Alerta('Exceção salva.', 'Aviso', 'success');
    } catch (erro) { CatchAlerta(erro, 'Não foi possível salvar a exceção'); }
    finally { setSalvando(false); }
  };

  const remover = async (excecaoId: number) => {
    try {
      setSalvando(true);
      await FetchReq({ endpoint: 'RemoverExcecaoSetor', variables: [departmentId, excecaoId] });
      if (id === excecaoId) setEditando(false);
      await carregar();
    } catch (erro) { CatchAlerta(erro, 'Não foi possível remover a exceção'); }
    finally { setSalvando(false); }
  };

  if (carregando) return <div className="flex justify-content-center p-4"><ProgressSpinner className="w-3rem" /></div>;
  if (!pronto) return <Button label="Tentar carregar novamente" icon="pi pi-refresh" onClick={carregar} />;

  return <div className="flex flex-column gap-3">
    <small className="text-color-secondary">Adicione somente as datas em que este setor terá um funcionamento diferente. A exceção pode valer só naquele ano ou se repetir anualmente. Uma exceção específica de um ano tem prioridade sobre a regra anual.</small>
    {!horarioAtivo && <Message severity="info" text="Ative Usar horário de atendimento na aba de horários para aplicar estas exceções. Enquanto estiver desligado, o setor permanece disponível." />}
    <Button label="Adicionar exceção" icon="pi pi-plus" className="align-self-start" disabled={somenteLeitura || salvando} onClick={() => abrir()} />
    <DataTable value={excecoes} dataKey="id" size="small" emptyMessage="Nenhuma exceção. Valem os horários e a opção de feriados configurados neste setor.">
      <Column header="Data" body={rotuloData} />
      <Column field="description" header="Descrição" />
      <Column header="Funcionamento" body={(linha: DepartmentScheduleExceptionResponse) => linha.mode === 'especial'
        ? linha.intervals.map((i) => `${i.start_time}–${i.end_time}`).join(' / ') : MODOS.find((m) => m.value === linha.mode)?.label} />
      <Column header="Ações" body={(linha: DepartmentScheduleExceptionResponse) => <div className="flex gap-1">
        <Button icon="pi pi-pencil" text aria-label="Editar exceção" disabled={somenteLeitura || salvando} onClick={() => abrir(linha)} />
        <Button icon="pi pi-trash" text severity="danger" aria-label="Remover exceção" disabled={somenteLeitura || salvando}
          onClick={() => ConfirmaAcao(`Remover a exceção de ${rotuloData(linha)}?`, remover, linha.id)} />
      </div>} />
    </DataTable>
    {editando && <div className="border-1 border-300 border-round-lg p-3 flex flex-column gap-3">
      <span className="font-semibold">{id ? 'Editar exceção' : 'Nova exceção'}</span>
      <div><LabelPlus text="Feriado cadastrado (opcional)" />
        <Dropdown value={feriadoId} options={feriados} optionLabel="name" optionValue="id" showClear filter disabled={salvando}
          placeholder="Outra data ou selecione um feriado" onChange={(e) => {
            setFeriadoId(e.value ?? null);
            const escolhido = feriados.find((f) => f.id === e.value);
            if (escolhido) {
              setData(proximaData(escolhido)); setDescricao(escolhido.name);
              if (!escolhido.recurring) setAnual(false);
            }
          }} />
      </div>
      <div><LabelPlus text="Repetição" required />
        <Dropdown value={anual} disabled={salvando} optionDisabled="disabled" options={[
          { label: 'Somente neste ano', value: false },
          { label: 'Repetir todos os anos', value: true, disabled: !!feriadoSelecionado && !feriadoSelecionado.recurring },
        ]} onChange={e => setAnual(e.value)} />
        <small className="block mt-2 text-color-secondary">{anual
          ? 'Vale todo ano neste dia e mês. O ano não é considerado; em 29/02, aplica-se somente nos anos bissextos.'
          : 'Vale somente na data completa informada abaixo, sem repetir no ano seguinte.'}</small>
        {feriadoSelecionado && !feriadoSelecionado.recurring && <small className="block mt-1 text-color-secondary">
          O feriado selecionado tem um ano específico e não permite repetição anual.
        </small>}
      </div>
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1"><LabelPlus text={anual ? 'Dia e mês' : 'Data'} required />
          {feriadoSelecionado ? <>
            <InputText aria-label={anual ? 'Dia e mês do feriado' : 'Data do feriado'} readOnly
              value={data ? anual ? `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}`
                : data.toLocaleDateString('pt-BR') : ''} />
            <small className="block mt-2 text-color-secondary">Data definida pelo feriado. Para usar outra data, remova a seleção do feriado.</small>
          </> : <Calendar key={anual ? 'anual' : 'pontual'} value={data} dateFormat={anual ? 'dd/mm' : 'dd/mm/yy'}
            showIcon disabled={salvando} onChange={(e) => setData(e.value as Date | null)} />}
        </div>
        {feriadoSelecionado?.recurring && !anual && <div className="flex-1"><LabelPlus text="Ano da exceção" required />
          <Calendar value={data} view="year" dateFormat="yy" showIcon readOnlyInput disabled={salvando}
            onChange={(e) => {
              const ano = (e.value as Date | null)?.getFullYear();
              if (ano === undefined) return;
              const nova = new Date(ano, feriadoSelecionado.month - 1, feriadoSelecionado.day);
              // Não deixa 29/02 virar 01/03 ao selecionar um ano não bissexto.
              if (nova.getMonth() !== feriadoSelecionado.month - 1 || nova.getDate() !== feriadoSelecionado.day) {
                Alerta('Este feriado não ocorre no ano selecionado. Escolha um ano bissexto para 29/02.', 'Atenção', 'warning'); return;
              }
              setData(nova);
            }} />
        </div>}
        <div className="flex-1"><LabelPlus text="Funcionamento" required />
          <Dropdown value={modo} options={MODOS} disabled={salvando} onChange={(e) => {
            setModo(e.value);
            if (e.value === 'especial' && !intervalos.length) setIntervalos([{ start_time: '08:00', end_time: '12:00' }]);
          }} />
        </div>
      </div>
      <div><LabelPlus text="Descrição" required /><InputText value={descricao} maxLength={120} disabled={salvando} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: expediente reduzido, treinamento" /></div>
      {modo === 'normal' && <small>Usa o horário semanal desta data, mesmo sendo feriado. Um dia da semana sem expediente continua fechado.</small>}
      {modo === 'especial' && <div className="flex flex-column gap-2">
        {intervalos.map((i, indice) => <div key={indice} className="flex align-items-center gap-2">
          <InputText value={i.start_time} maxLength={5} placeholder="Início (HH:mm)" aria-label={`Início do intervalo ${indice + 1}`} disabled={salvando}
            onChange={(e) => setIntervalos((atuais) => atuais.map((atual, n) => n === indice ? { ...atual, start_time: e.target.value } : atual))} />
          <span>até</span>
          <InputText value={i.end_time} maxLength={5} placeholder="Fim (HH:mm)" aria-label={`Fim do intervalo ${indice + 1}`} disabled={salvando}
            onChange={(e) => setIntervalos((atuais) => atuais.map((atual, n) => n === indice ? { ...atual, end_time: e.target.value } : atual))} />
          <Button icon="pi pi-trash" text severity="danger" aria-label="Remover intervalo" disabled={salvando} onClick={() => setIntervalos((atuais) => atuais.filter((_, n) => n !== indice))} />
        </div>)}
        <Button label="Adicionar horário" icon="pi pi-plus" text className="align-self-start" disabled={salvando || intervalos.length >= 48}
          onClick={() => setIntervalos((atuais) => [...atuais, { start_time: '', end_time: '' }])} />
      </div>}
      <div className="flex justify-content-end gap-2">
        <Button label="Cancelar" outlined disabled={salvando} onClick={() => setEditando(false)} style={{ width: 'auto' }} />
        <Button label="Salvar exceção" loading={salvando} onClick={salvar} style={{ width: 'auto' }} />
      </div>
    </div>}
  </div>;
}
