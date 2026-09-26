'use client';

import { useState } from 'react';

import useApi from '@/service/Api/ApiClient';
import {
  ContactResponse,
  ehAtendimentoFinalizado,
  podeAgirNoAtendimento,
  SupportChatsResponse,
  SupportChatStatusId,
} from '@/Interfaces';
import { CatchAlerta } from '@/service/Util';
import { useUsuarioLogado } from '@/hooks/useUsuarioLogado';
import { useChatStore } from '@/store/useChatStore';
import ModalContatoChat from '../_components/ModalContatoChat';
import SidebarDetalhesContato from '../_components/SidebarDetalhesContato';
import ModalFinalizarAtendimento from '../_components/ModalFinalizarAtendimento';
import ModalTransferirAtendimento from '../_components/ModalTransferirAtendimento';
import AcoesAtendimento from './_Header/AcoesAtendimento';
import AtendenteAtual from './_Header/AtendenteAtual';
import BadgeProtocolo from './_Header/BadgeProtocolo';
import Cronometro from './_Header/Cronometro';
import IdentificacaoContato from './_Header/IdentificacaoContato';
import { useSelecaoMensagens } from '@/store/useSelecaoMensagens';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';

type ModalAberto = 'finalizar' | 'contato' | 'transferir' | null;

/** O modo com que o diálogo de encerramento abre. */
type ModoFinalizar = 'normal' | 'sem-despedida' | 'sem-atendimento';

/** Fio fino entre os metadados do cabeçalho. */
const Divisor = () => (
  <span
    className="surface-300 flex-none"
    style={{ width: 1, height: '1rem' }}
  />
);

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
  const { usuarioId } = useUsuarioLogado();
  // Sem argumento: entra no modo com a lista vazia, para o atendente escolher
  // as mensagens. Pelo menu de uma bolha, ela já entra marcada.
  const entrarModoSelecao = useSelecaoMensagens((s) => s.entrarModoSelecao);

  // As mesmas permissões que o backend exige nas rotas correspondentes.
  const { podeEditar: podeAgir, podeAcao, carregado: permissoesCarregadas } =
    usePermissoesModulo('support.chat');
  const podeTransferir = podeAcao('transfer');
  const { podeEditar: podeEditarContato } = usePermissoesModulo('contact');

  const [modalAberto, setModalAberto] = useState<ModalAberto>(null);
  // O painel "Dados do atendimento" tem os dois caminhos para o mesmo modal:
  // "Editar contato" comum e o aviso de "sem cliente" - o segundo destaca o
  // campo Cliente, para não parecer que abriu "outra coisa" sem relação com
  // o que foi pedido.
  const [focarClienteAoAbrir, setFocarClienteAoAbrir] = useState(false);
  const [modoFinalizar, setModoFinalizar] = useState<ModoFinalizar>('normal');
  const [iniciando, setIniciando] = useState(false);
  const [detalhesAberto, setDetalhesAberto] = useState(false);

  if (!activeChat) return null;

  const status = activeChat.support_chat_status_id;
  const finalizado = ehAtendimentoFinalizado(status);
  const emAndamento = !finalizado && status === SupportChatStatusId.EM_ANDAMENTO;
  const aguardando =
    !finalizado &&
    (status === SupportChatStatusId.AGUARDANDO || status === SupportChatStatusId.EM_FILA);
  // Finalizar e transferir são do dono: o backend recusa de qualquer forma, e
  // oferecer o botão só para vê-lo falhar é pior do que não mostrá-lo.
  const souODono = podeAgirNoAtendimento(activeChat, usuarioId);

  /** Abre o diálogo de encerramento no modo pedido. */
  const abrirFinalizacao = (modo: ModoFinalizar) => {
    setModoFinalizar(modo);
    setModalAberto('finalizar');
  };

  /**
   * Devolve a conversa à lista como não lida.
   *
   * Não fecha a conversa: o atendente segue lendo, e o badge fica na lista
   * lateral como lembrete. Uma mensagem nova soma a partir daqui.
   */
  const marcarComoNaoLida = async () => {
    try {
      const atualizado = await FetchReq<SupportChatsResponse>({
        endpoint: 'MarcarConversaNaoLida',
        variables: [activeChat.id],
      });

      patchActiveChat(atualizado);
    } catch (erro) {
      CatchAlerta(erro, 'Não foi possível marcar como não lida');
    }
  };

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
      <div className="flex align-items-center gap-3 surface-100 border-1 border-primary-700 border-round-top px-3 py-1">
        <IdentificacaoContato
          contato={activeChat.contact}
          ultimaInteracao={activeChat.updated_at ?? activeChat.created_at}
          onAbrirDetalhes={() => setDetalhesAberto(true)}
        />

        {/* Protocolo e tempo são metadado, não ação: ficam à direita, na mesma
            linha e separados por um divisor fino, para lerem como um grupo sem
            precisarem de caixa própria. */}
        <div className="hidden md:flex align-items-center gap-3 flex-none">
          <BadgeProtocolo protocolo={activeChat.protocol} />

          {emAndamento && activeChat.answered_at && (
            <>
              <Divisor />
              <Cronometro inicio={activeChat.answered_at} />
            </>
          )}

          {/* Depois do tempo, e não antes: a pergunta "isto é meu?" só existe
              quando alguém já assumiu. */}
          {emAndamento && activeChat.user && (
            <>
              <Divisor />
              <AtendenteAtual atendente={activeChat.user} />
            </>
          )}
        </div>

        {/* Antes do cookie de permissões carregar, `podeAgir` é `false` por
            padrão (ver `usePermissoes`) - sem este guard, os botões de ação
            piscavam escondidos por um quadro toda vez que o chat abria ou
            trocava, antes de saber de verdade se o atendente pode agir. */}
        {permissoesCarregadas && (
          <AcoesAtendimento
            aguardando={aguardando}
            emAndamento={emAndamento}
            souODono={souODono}
            finalizado={finalizado}
            processando={iniciando}
            onIniciar={iniciarAtendimento}
            onFinalizar={() => abrirFinalizacao('normal')}
            onFinalizarSemDespedida={() => abrirFinalizacao('sem-despedida')}
            onFinalizarSemAtendimento={() => abrirFinalizacao('sem-atendimento')}
            onMarcarNaoLida={marcarComoNaoLida}
            onSelecionarMensagens={entrarModoSelecao}
            onEditarContato={() => setModalAberto('contato')}
            onTransferir={() => setModalAberto('transferir')}
            podeAgir={podeAgir}
            podeTransferir={podeTransferir}
            podeEditarContato={podeEditarContato}
          />
        )}
      </div>

      <ModalFinalizarAtendimento
        visible={modalAberto === 'finalizar'}
        onHide={() => setModalAberto(null)}
        chat={activeChat}
        modo={modoFinalizar}
        // Encerrado o atendimento, o painel volta ao estado inicial: manter o
        // histórico aberto em somente leitura sugere que ainda há o que fazer
        // ali. A conversa continua acessível pela URL, se precisar consultar.
        onFinalizado={fecharConversa}
        onContatoAtualizado={aoSalvarContato}
      />

      <ModalTransferirAtendimento
        visible={modalAberto === 'transferir'}
        onHide={() => setModalAberto(null)}
        chat={activeChat}
        // A conversa continua aberta: o atendente pode querer ler o que
        // escreveu antes de sair dela. O socket avisa os outros clientes, e o
        // header já reflete o dono novo.
        onTransferido={patchActiveChat}
      />

      <SidebarDetalhesContato
        visible={detalhesAberto}
        onHide={() => setDetalhesAberto(false)}
        contato={activeChat.contact}
        // Sem `contact:update` o painel abre em leitura, sem o botão de editar.
        onEditar={
          podeEditarContato
            ? (focarCliente) => {
                setDetalhesAberto(false);
                setFocarClienteAoAbrir(Boolean(focarCliente));
                setModalAberto('contato');
              }
            : undefined
        }
      />

      <ModalContatoChat
        visible={modalAberto === 'contato'}
        onHide={() => setModalAberto(null)}
        contato={activeChat.contact}
        onConfirm={aoSalvarContato}
        focarCliente={focarClienteAoAbrir}
      />
    </>
  );
};

export default Header;
