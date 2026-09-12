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

type ModalFinalizarAtendimentoProps = {
  visible: boolean;
  onHide: () => void;
  chat: SupportChatsResponse;
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

  const semCliente = !chat?.contact?.client_id;

  const duracao = chat?.answered_at
    ? formatDuracao(Math.floor((Date.now() - parseISO(chat.answered_at).getTime()) / 1000))
    : null;

  const finalizar = async () => {
    try {
      setFinalizando(true);

      const atualizado = await FetchReq<SupportChatsResponse>({
        endpoint: 'FinalizarAtendimentoChat',
        variables: [chat.id],
        body: { observation_user: relato.trim() || undefined },
      });

      onFinalizado(atualizado);
      onHide();
      Alerta('Atendimento finalizado com sucesso!', 'Aviso', 'success');
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
        label="Concluir atendimento"
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
        header="Finalizar atendimento"
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
            <div className="flex align-items-center gap-3 border-1 border-orange-300 bg-orange-50 border-round-lg p-3">
              <i className="fa-regular fa-triangle-exclamation text-xl text-orange-600" />
              <div className="flex-1 text-sm text-orange-900">
                Este contato ainda não está associado a um cliente. Associe antes de finalizar.
              </div>
              <Button
                label="Associar"
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
              Relato do atendimento
            </label>
            <InputTextarea
              id="relato"
              rows={4}
              autoResize
              autoFocus
              maxLength={LIMITE_RELATO}
              value={relato}
              onChange={(e) => setRelato(e.target.value)}
              placeholder="Descreva brevemente o que foi resolvido (opcional)"
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
