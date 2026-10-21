'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import LabelPlus from '@/components/LabelPlus';
import { AtendenteAgenda, ClientResponse, ContactResponse } from '@/Interfaces';
import { usePermissoes } from '@/hooks/usePermissoes';
import useApi from '@/service/Api/ApiClient';
import { Alerta, CatchAlerta } from '@/service/Util';

type Props = { visible: boolean; onHide: () => void; inicio?: Date; fim?: Date; onSalvo?: () => void };
type Formulario = { titulo: string; observacao: string; inicio_em: string; fim_em: string; lembrete_minutos: number; user_id?: number; client_id: number | null; contact_id: number | null };
const lembretes = [5, 10, 15, 20, 25, 30, 60].map((value) => ({ value, label: value === 60 ? '1 hora antes' : `${value} minutos antes` }));
const paraCampo = (valor: Date) => { const data = new Date(valor); data.setMinutes(data.getMinutes() - data.getTimezoneOffset()); return data.toISOString().slice(0, 16); };
const vazio = (inicio = new Date(), fim = new Date(inicio.getTime() + 60 * 60 * 1000)): Formulario => ({ titulo: '', observacao: '', inicio_em: paraCampo(inicio), fim_em: paraCampo(fim), lembrete_minutos: 30, client_id: null, contact_id: null });

export default function ModalNovoCompromisso({ visible, onHide, inicio, fim, onSalvo }: Props) {
  const { FetchReq } = useApi(); const { pode } = usePermissoes();
  const [formulario, setFormulario] = useState<Formulario>(vazio());
  const [atendentes, setAtendentes] = useState<AtendenteAgenda[]>([]); const [clientes, setClientes] = useState<ClientResponse[]>([]); const [contatos, setContatos] = useState<ContactResponse[]>([]);
  useEffect(() => { if (!visible) return; setFormulario(vazio(inicio, fim)); Promise.all([FetchReq<AtendenteAgenda[]>('ListarAtendentesAgenda'), FetchReq<ClientResponse[]>('ListarClientes').catch(() => []), FetchReq<ContactResponse[]>('ListarContatos').catch(() => [])]).then(([a, c, o]) => { setAtendentes(a ?? []); setClientes(c ?? []); setContatos(o ?? []); }); }, [visible, inicio, fim]);
  const atualizarInicio = (data: Date) => setFormulario((atual) => ({ ...atual, inicio_em: paraCampo(data), fim_em: paraCampo(new Date(atual.fim_em) <= data ? new Date(data.getTime() + 1800000) : new Date(atual.fim_em)) }));
  const salvar = async () => { try { await FetchReq({ endpoint: 'CriarCompromisso', body: { ...formulario, inicio_em: new Date(formulario.inicio_em).toISOString(), fim_em: new Date(formulario.fim_em).toISOString() } }); Alerta('Compromisso salvo.', 'Pronto', 'success'); onHide(); onSalvo?.(); } catch (erro) { CatchAlerta(erro, 'Não foi possível salvar o compromisso'); } };
  return <Dialog blockScroll header="Novo compromisso" visible={visible} onHide={onHide} style={{ width: 'min(95vw, 44rem)' }} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" text onClick={onHide} /><Button label="Salvar" disabled={!pode('schedule:add')} onClick={salvar} /></div>}><div className="grid p-fluid"><div className="col-12"><LabelPlus text="Título" required /><InputText value={formulario.titulo} onChange={(e) => setFormulario({ ...formulario, titulo: e.target.value })} /></div><div className="col-6"><LabelPlus text="Início" required /><Calendar value={new Date(formulario.inicio_em)} onChange={(e) => e.value instanceof Date && atualizarInicio(e.value)} dateFormat="dd/mm/yy" showTime hourFormat="24" stepMinute={30} showIcon /></div><div className="col-6"><LabelPlus text="Fim" required /><Calendar value={new Date(formulario.fim_em)} minDate={new Date(formulario.inicio_em)} onChange={(e) => e.value instanceof Date && e.value > new Date(formulario.inicio_em) && setFormulario({ ...formulario, fim_em: paraCampo(e.value) })} dateFormat="dd/mm/yy" showTime hourFormat="24" stepMinute={30} showIcon /></div><div className="col-12"><LabelPlus text="Observação" /><InputTextarea value={formulario.observacao} rows={4} autoResize onChange={(e) => setFormulario({ ...formulario, observacao: e.target.value })} /></div><div className="col-6"><LabelPlus text="Lembrete" /><Dropdown value={formulario.lembrete_minutos} options={lembretes} onChange={(e) => setFormulario({ ...formulario, lembrete_minutos: e.value })} /></div>{atendentes.length > 1 && <div className="col-6"><LabelPlus text="Atendente responsável" /><Dropdown value={formulario.user_id} options={atendentes} optionValue="id" optionLabel="name" placeholder="Eu" onChange={(e) => setFormulario({ ...formulario, user_id: Number(e.value) })} /></div>}<div className="col-6"><LabelPlus text="Cliente (opcional)" /><Dropdown value={formulario.client_id} options={clientes} optionValue="id" optionLabel="nome" showClear filter onChange={(e) => setFormulario({ ...formulario, client_id: e.value ?? null, contact_id: e.value ? null : formulario.contact_id })} /></div><div className="col-6"><LabelPlus text="Contato (opcional)" /><Dropdown value={formulario.contact_id} options={contatos} optionValue="id" optionLabel="name" showClear filter onChange={(e) => setFormulario({ ...formulario, contact_id: e.value ?? null, client_id: e.value ? null : formulario.client_id })} /></div></div></Dialog>;
}
