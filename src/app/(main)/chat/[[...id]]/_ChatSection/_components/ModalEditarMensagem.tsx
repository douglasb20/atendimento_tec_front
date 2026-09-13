'use client';

import { addMinutes, differenceInMinutes, parseISO } from 'date-fns';
import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { useEffect, useState } from 'react';

import { SupportChatMessageResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta } from '@/service/Util';

type ModalEditarMensagemProps = {
  visible: boolean;
  onHide: () => void;
  mensagem: SupportChatMessageResponse | null;
  supportChatId: string;
};

/** O WhatsApp recusa alterações depois disso. */
const JANELA_EDICAO_MIN = 15;

/**
 * O conteúdo guardado traz o prefixo `*Nome:*` que o backend acrescenta no
 * envio. Editar deve mexer só no que o atendente escreveu — o prefixo é
 * reposto do outro lado.
 */
const semPrefixo = (conteudo?: string) => (conteudo ?? '').replace(/^\*[^*]+:\*\n/, '');

const ModalEditarMensagem = ({
  visible,
  onHide,
  mensagem,
  supportChatId,
}: ModalEditarMensagemProps) => {
  const { FetchReq } = useApi();
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (visible) setTexto(semPrefixo(mensagem?.content));
  }, [visible, mensagem]);

  if (!mensagem) return null;

  const restante = mensagem.datetime
    ? differenceInMinutes(addMinutes(parseISO(mensagem.datetime), JANELA_EDICAO_MIN), new Date())
    : 0;

  const expirou = restante <= 0;
  const semMudanca = texto.trim() === semPrefixo(mensagem.content).trim();

  const salvar = async () => {
    try {
      setSalvando(true);

      await FetchReq({
        endpoint: 'EditarMensagem',
        variables: [supportChatId],
        body: { message_id: mensagem.message_id, message: texto.trim() },
      });

      // A bolha se atualiza pelo webhook `messages.edited`, que confirma que o
      // WhatsApp aceitou a alteração.
      onHide();
    } catch (erro) {
      CatchAlerta(erro, 'Não foi possível editar a mensagem');
    } finally {
      setSalvando(false);
    }
  };

  const rodape = () => (
    <div className="flex justify-content-between">
      <Button
        label="Cancelar"
        severity="danger"
        outlined
        onClick={onHide}
        disabled={salvando}
      />
      <Button
        label="Salvar alteração"
        icon="fa-regular fa-check"
        loading={salvando}
        disabled={expirou || semMudanca || !texto.trim()}
        onClick={salvar}
      />
    </div>
  );

  return (
    <Modal
      modal
      className="p-fluid"
      style={{ width: '38rem' }}
      breakpoints={{ '640px': '95vw' }}
      visible={visible}
      header="Editar mensagem"
      onHide={onHide}
      footer={rodape}
    >
      <div className="flex flex-column gap-2">
        <InputTextarea
          rows={4}
          autoResize
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva a mensagem"
          disabled={expirou}
        />

        {expirou ? (
          <small className="flex align-items-center gap-2 text-orange-700">
            <i className="fa-regular fa-clock" />O prazo de {JANELA_EDICAO_MIN} minutos para editar
            esta mensagem já passou.
          </small>
        ) : (
          <small className="text-500">
            Editável por mais {restante} {restante === 1 ? 'minuto' : 'minutos'}.
          </small>
        )}
      </div>
    </Modal>
  );
};

export default ModalEditarMensagem;
