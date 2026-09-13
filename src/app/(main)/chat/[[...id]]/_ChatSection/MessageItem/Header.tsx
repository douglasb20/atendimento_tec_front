'use client';

import { useState } from 'react';

import useApi from '@/service/Api/ApiClient';
import {
  ContactResponse,
  ehAtendimentoFinalizado,
  SupportChatsResponse,
  SupportChatStatusId,
} from '@/Interfaces';
import { CatchAlerta } from '@/service/Util';
import { useChatStore } from '@/store/useChatStore';
import ModalContatoChat from '../_components/ModalContatoChat';
import ModalFinalizarAtendimento from '../_components/ModalFinalizarAtendimento';
import AcoesAtendimento from './_Header/AcoesAtendimento';
import BadgeProtocolo from './_Header/BadgeProtocolo';
import Cronometro from './_Header/Cronometro';
import IdentificacaoContato from './_Header/IdentificacaoContato';

type ModalAberto = 'finalizar' | 'contato' | null;

/**
 * Cabeçalho da conversa, com o estado do atendimento e suas ações.
 *
 * Enquanto ninguém assume, mostra só o protocolo e o botão de iniciar - o
 * cronômetro não corre e não há o que finalizar. Assumido, aparecem o tempo
 * decorrido, o encerramento e o cadastro do contato.
 */
const Header = () => {
  const { FetchReq } = useApi();
  const activeChat = useChatStore((s) => s.activeChat);
  const patchActiveChat = useChatStore((s) => s.patchActiveChat);
  const fecharConversa = useChatStore((s) => s.fecharConversa);

  const [modalAberto, setModalAberto] = useState<ModalAberto>(null);
  const [iniciando, setIniciando] = useState(false);

  if (!activeChat) return null;

  const status = activeChat.support_chat_status_id;
  const finalizado = ehAtendimentoFinalizado(status);
  const emAndamento = !finalizado && status === SupportChatStatusId.EM_ANDAMENTO;
  const aguardando =
    !finalizado &&
    (status === SupportChatStatusId.AGUARDANDO || status === SupportChatStatusId.EM_FILA);

  const iniciarAtendimento = async () => {
    try {
      setIniciando(true);

      const atualizado = await FetchReq<SupportChatsResponse>({
        endpoint: 'IniciarAtendimentoChat',
        variables: [activeChat.id],
      });

      // A tela reage aqui; o eco do socket chega depois e é idempotente.
      patchActiveChat(atualizado);
    } catch (erro) {
      CatchAlerta(erro, 'Não foi possível iniciar o atendimento');
    } finally {
      setIniciando(false);
    }
  };

  const aoSalvarContato = (contato: ContactResponse) => patchActiveChat({ contact: contato });

  return (
    <>
      <div className="flex align-items-center gap-3 surface-100 border-1 border-primary-300 border-round-top px-3 py-3">
        <IdentificacaoContato
          contato={activeChat.contact}
          ultimaInteracao={activeChat.updated_at ?? activeChat.created_at}
        />

        {/* Protocolo e tempo são metadado, não ação: ficam à direita, na mesma
            linha e separados por um divisor fino, para lerem como um grupo sem
            precisarem de caixa própria. */}
        <div className="hidden md:flex align-items-center gap-3 flex-none">
          <BadgeProtocolo protocolo={activeChat.protocol} />

          {emAndamento && activeChat.answered_at && (
            <>
              <span
                className="surface-300 flex-none"
                style={{ width: 1, height: '1rem' }}
              />
              <Cronometro inicio={activeChat.answered_at} />
            </>
          )}
        </div>

        <AcoesAtendimento
          aguardando={aguardando}
          emAndamento={emAndamento}
          finalizado={finalizado}
          processando={iniciando}
          onIniciar={iniciarAtendimento}
          onFinalizar={() => setModalAberto('finalizar')}
          onEditarContato={() => setModalAberto('contato')}
        />
      </div>

      <ModalFinalizarAtendimento
        visible={modalAberto === 'finalizar'}
        onHide={() => setModalAberto(null)}
        chat={activeChat}
        // Encerrado o atendimento, o painel volta ao estado inicial: manter o
        // histórico aberto em somente leitura sugere que ainda há o que fazer
        // ali. A conversa continua acessível pela URL, se precisar consultar.
        onFinalizado={fecharConversa}
        onContatoAtualizado={aoSalvarContato}
      />

      <ModalContatoChat
        visible={modalAberto === 'contato'}
        onHide={() => setModalAberto(null)}
        contato={activeChat.contact}
        onConfirm={aoSalvarContato}
      />
    </>
  );
};

export default Header;
