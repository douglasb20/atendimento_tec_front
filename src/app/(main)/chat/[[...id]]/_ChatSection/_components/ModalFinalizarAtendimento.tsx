'use client';

import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputSwitch } from 'primereact/inputswitch';
import { Message } from 'primereact/message';
import { useEffect, useState } from 'react';

import useApi from '@/service/Api/ApiClient';
import { ContactResponse, SupportChatsResponse } from '@/Interfaces';
import {
  CatchAlerta,
  formatDuracao,
  nomeExibicao,
  segundosDeAtendimento,
} from '@/service/Util';
import { mostrarToast } from '@/components/ToastGlobal';
import ModalContatoChat from './ModalContatoChat';

/**
 * As três formas de encerrar, que mudam o endpoint e as exigências:
 *
 * - `normal` envia a despedida do canal e exige cliente associado;
 * - `sem-despedida` é igual, mas pula o texto de despedida;
 * - `sem-atendimento` encerra de Aguardando, **sem exigir cliente** e sem
 *   despedida - é o descarte de spam ou de contato que não será atendido.
 */
export type ModoFinalizacao = 'normal' | 'sem-despedida' | 'sem-atendimento';

type ModalFinalizarAtendimentoProps = {
  visible: boolean;
  onHide: () => void;
  chat: SupportChatsResponse;
  /** Padrão `normal`. */
  modo?: ModoFinalizacao;
  /** Chamado com a conversa finalizada e, antes disso, com o contato salvo. */
  onFinalizado: (chat: SupportChatsResponse) => void;
  onContatoAtualizado: (contato: ContactResponse) => void;
};

const LIMITE_RELATO = 5000;
type ConfiguracaoSaida = { id: number; name: string; executar_por_padrao: boolean; pode_alterar: boolean };

/**
 * Encerramento do atendimento.
 *
 * O vínculo com um cliente é exigido aqui porque o atendimento encerrado passa
 * a compor o histórico do cliente - sem ele, o registro se perde. A pendência
 * aparece dentro do próprio diálogo, com o cadastro à mão, em vez de barrar o
 * atendente com uma mensagem de erro.
 */
const ModalFinalizarAtendimento = ({
  visible,
  onHide,
  chat,
  modo = 'normal',
  onFinalizado,
  onContatoAtualizado,
}: ModalFinalizarAtendimentoProps) => {
  const { FetchReq } = useApi();
  const [relato, setRelato] = useState('');
  const [finalizando, setFinalizando] = useState(false);
  const [modalContatoAberto, setModalContatoAberto] = useState(false);
  const [marcandoSemCliente, setMarcandoSemCliente] = useState(false);
  const [enviarDespedida, setEnviarDespedida] = useState(true);
  const [executarSaida, setExecutarSaida] = useState(false);
  const [fluxoSaida, setFluxoSaida] = useState<ConfiguracaoSaida | null>(null);
  const [consultandoSaida, setConsultandoSaida] = useState(false);
  const [erroSaida, setErroSaida] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setRelato(''); setEnviarDespedida(modo !== 'sem-despedida');
    setExecutarSaida(false); setFluxoSaida(null); setErroSaida(false);
    if (modo === 'sem-atendimento') return;
    let cancelado = false;
    setConsultandoSaida(true);
    FetchReq<ConfiguracaoSaida | null>('ConsultarFluxoSaidaAtendimento', [chat.id])
      .then((fluxo) => { if (!cancelado) { setFluxoSaida(fluxo); setExecutarSaida(fluxo?.executar_por_padrao ?? false); } })
      .catch(() => { if (!cancelado) setErroSaida(true); })
      .finally(() => { if (!cancelado) setConsultandoSaida(false); });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, chat?.id, modo]);

  const descarte = modo === 'sem-atendimento';

  // O descarte não exige cliente: encerrar spam não pode dar mais trabalho do
  // que atender. Nos outros dois o vínculo continua obrigatório - a não ser
  // que o contato esteja marcado como isento (fornecedor, parceiro etc).
  const semCliente =
    !descarte && !chat?.contact?.client_id && !chat?.contact?.has_no_client;

  // Mesma conta do cronômetro do cabeçalho (`Cronometro`), inclusive o
  // desconto das pausas: antes o resumo somava o tempo pausado e mostrava uma
  // duração maior que a do contador na tela.
  const segundos = segundosDeAtendimento(chat ?? {});
  const duracao = segundos === null ? null : formatDuracao(segundos);

  /** Atalho para não sair deste modal só para marcar a isenção - mesmo campo
   * do cadastro completo (`ModalContatoChat`), só que direto daqui. */
  const marcarSemCliente = async () => {
    try {
      setMarcandoSemCliente(true);

      const salvo = await FetchReq<ContactResponse>({
        endpoint: 'AtualizarContato',
        variables: [chat.contact.id],
        body: { has_no_client: true },
      });

      onContatoAtualizado(salvo);
    } catch (erro) {
      CatchAlerta(erro, 'Não foi possível marcar o contato como sem cliente');
    } finally {
      setMarcandoSemCliente(false);
    }
  };

  const finalizar = async () => {
    try {
      setFinalizando(true);

      const atualizado = await FetchReq<SupportChatsResponse>({
        endpoint: descarte ? 'FinalizarSemAtendimento' : 'FinalizarAtendimentoChat',
        variables: [chat.id],
        body: {
          observation_user: relato.trim() || undefined,
          // Só no fluxo normal: a rota do descarte nunca envia despedida.
          ...(descarte ? {} : { sem_despedida: !enviarDespedida, executar_fluxo_saida: executarSaida && !!fluxoSaida }),
        },
      });

      onFinalizado(atualizado);
      onHide();
      mostrarToast(
        descarte ? 'Conversa encerrada sem atendimento.' : atualizado.pos_atendimento_ativo
          ? 'Atendimento humano finalizado. O fluxo de saída continua no mesmo protocolo.' : 'Atendimento finalizado com sucesso!',
      );
    } catch (erro) {
      CatchAlerta(erro, 'Não foi possível finalizar o atendimento');
    } finally {
      setFinalizando(false);
    }
  };

  const rodape = () => (
    <div className="flex justify-content-between">
      <Button
        label="Cancelar"
        severity="danger"
        outlined
        onClick={onHide}
        disabled={finalizando}
      />
      <Button
        label={descarte ? 'Encerrar sem atender' : 'Concluir atendimento'}
        icon="fa-regular fa-check"
        severity="success"
        loading={finalizando}
        disabled={semCliente || !descarte && (consultandoSaida || erroSaida)}
        tooltip={semCliente ? 'Associe um cliente antes de finalizar' : undefined}
        tooltipOptions={{ position: 'top', showOnDisabled: true }}
        onClick={finalizar}
      />
    </div>
  );

  return (
    <>
      <Modal
        modal
        className="p-fluid"
        style={{ width: '42rem' }}
        breakpoints={{ '640px': '95vw' }}
        visible={visible}
        header={
          descarte
            ? 'Encerrar sem atendimento'
            : !enviarDespedida
              ? 'Finalizar sem despedida'
              : 'Finalizar atendimento'
        }
        onHide={onHide}
        footer={rodape}
      >
        <div className="flex flex-column gap-3">
          <div className="flex flex-column gap-1 surface-100 border-round-lg p-3 text-sm">
            <div className="flex justify-content-between gap-3">
              <span className="text-600">Contato</span>
              <span className="font-medium text-right">{nomeExibicao(chat?.contact)}</span>
            </div>
            <div className="flex justify-content-between gap-3">
              <span className="text-600">Protocolo</span>
              <span
                className="font-medium"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {chat?.protocol}
              </span>
            </div>
            {duracao && (
              <div className="flex justify-content-between gap-3">
                <span className="text-600">Duração</span>
                <span
                  className="font-medium"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {duracao}
                </span>
              </div>
            )}
          </div>

          {semCliente && (
            <div className="flex flex-column gap-3 border-1 border-orange-300 bg-orange-50 border-round-lg p-3">
              <div className="flex align-items-start gap-2">
                <i className="fa-regular fa-triangle-exclamation text-xl text-orange-600 mt-1" />
                <span className="text-sm text-orange-900">
                  Este contato ainda não está associado a um cliente. Associe antes de finalizar.
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  label="Associar cliente"
                  icon="fa-regular fa-link"
                  size="small"
                  onClick={() => setModalContatoAberto(true)}
                />
                <Button
                  label="Contato sem cliente"
                  icon="fa-regular fa-user-slash"
                  size="small"
                  outlined
                  loading={marcandoSemCliente}
                  tooltip="Para fornecedor, parceiro etc - contatos que nunca terão cliente"
                  tooltipOptions={{ position: 'top' }}
                  onClick={marcarSemCliente}
                />
              </div>
            </div>
          )}

          {!descarte && <div className="flex flex-column gap-3">
            <div className="flex align-items-center justify-content-between gap-3">
              <label htmlFor="enviar-despedida">Enviar despedida configurada</label>
              <InputSwitch inputId="enviar-despedida" checked={enviarDespedida} onChange={(e) => setEnviarDespedida(e.value)} disabled={finalizando} />
            </div>
            {consultandoSaida && <small>Consultando o fluxo de saída do canal…</small>}
            {erroSaida && <div><Message severity="warn" text="Não foi possível consultar o fluxo de saída. Feche e abra novamente este diálogo para tentar de novo." /></div>}
            {fluxoSaida && <>
              <div className="flex align-items-center justify-content-between gap-3">
                <label htmlFor="executar-saida">Executar fluxo de saída</label>
                <InputSwitch inputId="executar-saida" checked={executarSaida} onChange={(e) => setExecutarSaida(e.value)}
                  disabled={finalizando || !fluxoSaida.pode_alterar} />
              </div>
              <small className="text-color-secondary">{fluxoSaida.name}. Continua no mesmo protocolo, sem aumentar a duração do atendimento humano. O fim do fluxo não envia outra despedida.</small>
              {!fluxoSaida.pode_alterar && <small className="text-color-secondary">Esta escolha segue o padrão do canal. Você não tem permissão para alterá-la.</small>}
            </>}
          </div>}
          <div>
            <label
              htmlFor="relato"
              className="block mb-2 font-medium"
            >
              {descarte ? 'Motivo' : 'Relato do atendimento'}
            </label>
            <InputTextarea
              id="relato"
              rows={4}
              autoResize
              autoFocus
              maxLength={LIMITE_RELATO}
              value={relato}
              onChange={(e) => setRelato(e.target.value)}
              placeholder={
                descarte
                  ? 'Por que esta conversa não será atendida? (opcional)'
                  : 'Descreva brevemente o que foi resolvido (opcional)'
              }
            />
            <small className="block mt-1 text-right text-500">
              {relato.length}/{LIMITE_RELATO}
            </small>
          </div>
        </div>
      </Modal>

      <ModalContatoChat
        visible={modalContatoAberto}
        onHide={() => setModalContatoAberto(false)}
        contato={chat?.contact}
        onConfirm={onContatoAtualizado}
        focarCliente
      />
    </>
  );
};

export default ModalFinalizarAtendimento;
