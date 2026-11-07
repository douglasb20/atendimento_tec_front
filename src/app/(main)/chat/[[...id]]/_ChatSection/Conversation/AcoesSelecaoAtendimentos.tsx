'use client';

import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { InputSwitch } from 'primereact/inputswitch';
import { Message } from 'primereact/message';
import { useEffect, useMemo, useRef, useState } from 'react';

import LabelPlus from '@/components/LabelPlus';
import { mostrarToast } from '@/components/ToastGlobal';
import { SupportChatsResponse } from '@/Interfaces';
import { usePermissoes } from '@/hooks/usePermissoes';
import useApi from '@/service/Api/ApiClient';
import {
  chaveSaidaLote, corpoFinalizacaoLote, executarAcaoEmLote, finalizaSemAtendimentoLote, FluxoSaidaLote,
  gruposSaidaLote, impedimentoFinalizacaoLote, PreparacaoFinalizacaoLote, ResultadoAcaoLote,
} from '@/service/AcoesAtendimentosEmLote';
import { nomeExibicao } from '@/service/Util';
import { useChatStore } from '@/store/useChatStore';

type Props = {
  conversas: SupportChatsResponse[];
  todosVisiveisSelecionados: boolean;
  semConversasVisiveis: boolean;
  ocupado: boolean;
  onOcupado: (valor: boolean) => void;
  onSelecionarVisiveis: (selecionar: boolean) => void;
  onConcluidos: (ids: string[], houveFalhas: boolean) => void;
  onCancelar: () => void;
};

export default function AcoesSelecaoAtendimentos(props: Props) {
  const { FetchReq } = useApi();
  const { pode, ehSuperusuario, usuarioId } = usePermissoes();
  const updateChat = useChatStore(s => s.updateChat);
  const setUnreadCount = useChatStore(s => s.setUnreadCount);
  const [snapshot, setSnapshot] = useState<SupportChatsResponse[] | null>(null);
  const [preparados, setPreparados] = useState<PreparacaoFinalizacaoLote[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviarDespedida, setEnviarDespedida] = useState(true);
  const [escolhasSaida, setEscolhasSaida] = useState<Record<string, boolean>>({});
  const [progresso, setProgresso] = useState('');
  const [falhas, setFalhas] = useState<{ id: string; nome: string; erro: string }[]>([]);
  const emExecucao = useRef(false);
  const podeFinalizar = pode('support.chat:update');
  const grupos = useMemo(() => gruposSaidaLote(preparados), [preparados]);
  const aptos = preparados.filter(item => !item.erro);
  const semAtendimento = aptos.filter(item => finalizaSemAtendimentoLote(item.conversa));
  const normais = aptos.filter(item => !finalizaSemAtendimentoLote(item.conversa));

  useEffect(() => {
    if (!snapshot) return;
    let cancelado = false;
    setCarregando(true);
    setPreparados([]);
    setEscolhasSaida({});
    const porId = new Map(snapshot.map(conversa => [String(conversa.id), conversa]));
    executarAcaoEmLote(snapshot.map(conversa => String(conversa.id)), async id => {
      const conversa = porId.get(id)!;
      const erro = impedimentoFinalizacaoLote(conversa, usuarioId, ehSuperusuario, podeFinalizar);
      if (erro) return { conversa, fluxo: null, erro } as PreparacaoFinalizacaoLote;
      if (finalizaSemAtendimentoLote(conversa)) return { conversa, fluxo: null } as PreparacaoFinalizacaoLote;
      const fluxo = await FetchReq<FluxoSaidaLote | null>('ConsultarFluxoSaidaAtendimento', [id]);
      return { conversa, fluxo } as PreparacaoFinalizacaoLote;
    }).then(resultados => {
      if (cancelado) return;
      setPreparados(resultados.map(resultado => resultado.sucesso ? resultado.dados : {
        conversa: porId.get(resultado.id)!, fluxo: null, erro: 'Não foi possível consultar a configuração. Feche e abra esta confirmação para tentar novamente.',
      }));
      setCarregando(false);
    });
    return () => { cancelado = true; };
    // O snapshot permanece fixo enquanto eventos atualizam a lista ao fundo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot]);

  function concluir(resultados: ResultadoAcaoLote[], conversas: SupportChatsResponse[], verbo: string) {
    const nomes = new Map(conversas.map(conversa => [String(conversa.id), nomeExibicao(conversa.contact) || conversa.protocol]));
    const erros = resultados.filter(resultado => !resultado.sucesso);
    setFalhas(erros.map(resultado => ({ id: resultado.id, nome: nomes.get(resultado.id) || resultado.id, erro: 'erro' in resultado ? resultado.erro : '' })));
    const sucessos = resultados.filter(resultado => resultado.sucesso).map(resultado => resultado.id);
    props.onConcluidos(sucessos, !!erros.length);
    mostrarToast(`${sucessos.length} ${verbo}.${erros.length ? ` ${erros.length} não concluídos; confira os detalhes na seleção.` : ''}`, 'Ação em lote', erros.length ? 'warn' : 'success');
  }

  async function marcarLidas() {
    if (emExecucao.current || props.ocupado || !props.conversas.length) return;
    const conversas = props.conversas.slice();
    emExecucao.current = true;
    props.onOcupado(true); setFalhas([]); setProgresso('Marcando como lidas...');
    try {
      const resultados = await executarAcaoEmLote(conversas.map(conversa => String(conversa.id)), async id => {
        await FetchReq({ endpoint: 'MarcarConversaLida', variables: [id] });
        const atual = useChatStore.getState().chats.find(conversa => String(conversa.id) === id);
        if (atual) updateChat({ ...atual, marked_unread: false });
        setUnreadCount(id, 0);
      }, (atual, total) => setProgresso(`Marcando como lidas: ${atual} de ${total}`));
      concluir(resultados, conversas, 'conversas marcadas como lidas');
    } finally { emExecucao.current = false; props.onOcupado(false); setProgresso(''); }
  }

  async function finalizar() {
    if (emExecucao.current || props.ocupado || carregando || !aptos.length) return;
    const itens = preparados.slice();
    emExecucao.current = true;
    props.onOcupado(true); setFalhas([]); setProgresso('Finalizando...');
    try {
      const resultados = await executarAcaoEmLote(itens.map(item => String(item.conversa.id)), async id => {
        const item = itens.find(candidato => String(candidato.conversa.id) === id)!;
        if (item.erro) throw { response: { data: { message: item.erro } } };
        const executarSaida = escolhasSaida[chaveSaidaLote(item)] ?? item.fluxo?.executar_por_padrao ?? false;
        const semAtendimento = finalizaSemAtendimentoLote(item.conversa);
        const atualizado = await FetchReq<SupportChatsResponse>({ endpoint: semAtendimento ? 'FinalizarSemAtendimento' : 'FinalizarAtendimentoChat', variables: [id],
          body: semAtendimento ? {} : corpoFinalizacaoLote(item.fluxo, enviarDespedida, executarSaida) });
        updateChat(atualizado);
      }, (atual, total) => setProgresso(`Finalizando: ${atual} de ${total}`));
      setSnapshot(null);
      concluir(resultados, itens.map(item => item.conversa), 'atendimentos finalizados');
    } finally { emExecucao.current = false; props.onOcupado(false); setProgresso(''); }
  }

  return <>
    <div className="flex flex-column gap-2 border-bottom-1 surface-border pb-3 mb-2" aria-label="Ações dos atendimentos selecionados">
      <div className="flex align-items-center justify-content-between gap-2">
        <strong className="white-space-nowrap" aria-live="polite">{props.conversas.length} selecionados</strong>
        <Button label="Cancelar seleção" icon="pi pi-times" text size="small" className="w-auto flex-none" disabled={props.ocupado} onClick={props.onCancelar} />
      </div>
      <div className="flex align-items-center gap-2">
        <Checkbox inputId="selecionar-atendimentos-visiveis" checked={props.todosVisiveisSelecionados}
          disabled={props.ocupado || props.semConversasVisiveis} onChange={evento => props.onSelecionarVisiveis(!!evento.checked)} />
        <label htmlFor="selecionar-atendimentos-visiveis" className="text-sm">Selecionar todos desta fila</label>
      </div>
      <div className="flex gap-2">
        <Button label="Marcar como lida" icon="pi pi-check" size="small" className="flex-1 w-auto min-w-0 justify-content-center" disabled={props.ocupado || !props.conversas.length} onClick={marcarLidas} />
        {podeFinalizar && <Button label="Finalizar" icon="pi pi-check-circle" severity="success" size="small"
          className="flex-1 w-auto min-w-0 justify-content-center"
          disabled={props.ocupado || !props.conversas.length} onClick={() => { setCarregando(true); setEnviarDespedida(true); setSnapshot(props.conversas.slice()); }} />}
      </div>
      {progresso && <small role="status">{progresso}</small>}
      {!!falhas.length && <div role="alert" className="flex flex-column gap-2">
        <Message severity="warn" text="Estas conversas não foram concluídas. Confira o motivo antes de tentar novamente." />
        {falhas.map(falha => <div key={falha.id} className="text-sm"><strong>{falha.nome}:</strong> {falha.erro}</div>)}
      </div>}
    </div>
    <Dialog header="Finalizar atendimentos selecionados" visible={snapshot !== null} modal blockScroll
      style={{ width: 'min(95vw, 42rem)' }} closable={!props.ocupado} closeOnEscape={!props.ocupado}
      onHide={() => { if (!props.ocupado) setSnapshot(null); }}
      footer={<div className="flex justify-content-between gap-2">
        <Button label="Cancelar" outlined disabled={props.ocupado} onClick={() => setSnapshot(null)} />
        <Button label={`Finalizar ${aptos.length} atendimentos`} severity="success" loading={props.ocupado}
          disabled={carregando || !aptos.length || props.ocupado} onClick={finalizar} />
      </div>}>
      <div className="flex flex-column gap-3">
        {carregando ? <span role="status">Consultando as configurações dos atendimentos...</span> : <>
          {!!semAtendimento.length && <Message severity="info" text={`${semAtendimento.length} conversas não iniciadas serão finalizadas sem atendimento, sem despedida nem fluxo de saída.`} />}
          {!!normais.length && <div className="flex align-items-center gap-2">
            <InputSwitch inputId="lote-enviar-despedida" checked={enviarDespedida} disabled={props.ocupado} onChange={evento => setEnviarDespedida(evento.value)} />
            <LabelPlus htmlFor="lote-enviar-despedida" text="Enviar despedida configurada"
              textHelp="Cada atendimento usa a despedida do seu canal. Contatos com automações desabilitadas não recebem mensagens automáticas." />
          </div>}
          {grupos.map(grupo => <div key={grupo.chave} className="surface-100 border-round p-3 flex flex-column gap-2">
            <strong>{grupo.canal}</strong>
            <div className="flex align-items-center gap-2">
              <InputSwitch inputId={`lote-saida-${grupo.chave}`} checked={escolhasSaida[grupo.chave] ?? grupo.fluxo.executar_por_padrao}
                disabled={props.ocupado || !grupo.fluxo.pode_alterar}
                onChange={evento => setEscolhasSaida(atual => ({ ...atual, [grupo.chave]: evento.value }))} />
              <LabelPlus htmlFor={`lote-saida-${grupo.chave}`} text="Executar fluxo de saída"
                textHelp="Executa o fluxo ativo e publicado do canal no mesmo protocolo. A despedida é uma escolha independente." />
            </div>
            <small>{grupo.fluxo.name}, {grupo.quantidade} atendimentos.</small>
            {!grupo.fluxo.pode_alterar && <small>O padrão do canal é obrigatório para seu usuário.</small>}
          </div>)}
          {!!normais.length && !grupos.length && <small>Nenhum fluxo de saída disponível para os atendimentos aptos.</small>}
          <div className="flex flex-column gap-2">
            {preparados.map(item => <div key={item.conversa.id} className="border-bottom-1 surface-border pb-2 text-sm">
              <strong>{nomeExibicao(item.conversa.contact) || 'Contato'}</strong> <span className="text-color-secondary">#{item.conversa.protocol}</span>
              {item.erro && <div className="text-orange-500 mt-1">{item.erro}</div>}
              {!item.erro && finalizaSemAtendimentoLote(item.conversa) && <div className="text-color-secondary mt-1">Finalizar sem atendimento</div>}
            </div>)}
          </div>
        </>}
        {progresso && <span role="status">{progresso}</span>}
      </div>
    </Dialog>
  </>;
}
