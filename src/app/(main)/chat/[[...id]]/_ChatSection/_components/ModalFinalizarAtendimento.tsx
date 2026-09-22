'use client';

import { parseISO } from 'date-fns';
import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { useEffect, useState } from 'react';

import useApi from '@/service/Api/ApiClient';
import { ContactResponse, SupportChatsResponse } from '@/Interfaces';
import { Alerta, CatchAlerta, formatDuracao, nomeExibicao } from '@/service/Util';
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

  useEffect(() => {
    if (visible) setRelato('');
  }, [visible]);

  const descarte = modo === 'sem-atendimento';

  // O descarte não exige cliente: encerrar spam não pode dar mais trabalho do
  // que atender. Nos outros dois o vínculo continua obrigatório.
  const semCliente = !descarte && !chat?.contact?.client_id;

  const duracao = chat?.answered_at
    ? formatDuracao(Math.floor((Date.now() - parseISO(chat.answered_at).getTime()) / 1000))
    : null;

  const finalizar = async () => {
    try {
      setFinalizando(true);

      const atualizado = await FetchReq<SupportChatsResponse>({
        endpoint: descarte ? 'FinalizarSemAtendimento' : 'FinalizarAtendimentoChat',
        variables: [chat.id],
        body: {
          observation_user: relato.trim() || undefined,
          // Só no fluxo normal: a rota do descarte nunca envia despedida.
          ...(descarte ? {} : { sem_despedida: modo === 'sem-despedida' }),
        },
      });

      onFinalizado(atualizado);
      onHide();
      Alerta(
        descarte ? 'Conversa encerrada sem atendimento.' : 'Atendimento finalizado com sucesso!',
        'Aviso',
        'success',
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
        disabled={semCliente}
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
            : modo === 'sem-despedida'
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
              <Button
                label="Associar cliente"
                icon="fa-regular fa-link"
                size="small"
                onClick={() => setModalContatoAberto(true)}
              />
            </div>
          )}

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
      />
    </>
  );
};

export default ModalFinalizarAtendimento;
