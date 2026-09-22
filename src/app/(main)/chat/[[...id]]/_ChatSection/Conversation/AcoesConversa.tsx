'use client';

import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import { MenuItem } from 'primereact/menuitem';
import { useRef, useState } from 'react';

import {
  ContactResponse,
  podeAgirNoAtendimento,
  SupportChatsResponse,
  SupportChatStatusId,
} from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta } from '@/service/Util';
import { useChatStore } from '@/store/useChatStore';
import { useUsuarioLogado } from '@/hooks/useUsuarioLogado';

import ModalContatoChat from '../_components/ModalContatoChat';
import ModalFinalizarAtendimento, {
  ModoFinalizacao,
} from '../_components/ModalFinalizarAtendimento';
import ModalTransferirAtendimento from '../_components/ModalTransferirAtendimento';
import SidebarDetalhesContato from '../_components/SidebarDetalhesContato';

type AcoesConversaProps = {
  conversa: SupportChatsResponse;
};

/**
 * Ações da conversa direto na lista, sem precisar abri-la.
 *
 * O ganho é a triagem: com a fila cheia, descartar um marketing ou assumir um
 * atendimento não deveria custar entrar na conversa, esperar o histórico
 * carregar e voltar.
 *
 * ⚠️ **Os modais vivem aqui, não no `Header`.** Aquele só existe com conversa
 * aberta, que é justamente o que este componente evita. Eles recebem a conversa
 * por prop, então funcionam com qualquer uma - não só a ativa.
 *
 * "Selecionar mensagens" fica de fora: ela marca bolhas na tela, e não há tela
 * sem a conversa aberta.
 */
const AcoesConversa = ({ conversa }: AcoesConversaProps) => {
  const menuRef = useRef<Menu>(null);
  const { FetchReq } = useApi();
  const { usuarioId } = useUsuarioLogado();
  const updateChat = useChatStore((s) => s.updateChat);

  const [modalFinalizar, setModalFinalizar] = useState<ModoFinalizacao | null>(null);
  const [transferirAberto, setTransferirAberto] = useState(false);
  const [detalhesAberto, setDetalhesAberto] = useState(false);
  const [contatoAberto, setContatoAberto] = useState(false);
  const [iniciando, setIniciando] = useState(false);

  // Com o menu aberto o ponteiro sai do cartão, e só o `:hover` faria o botão
  // sumir por baixo do próprio menu.
  const [menuAberto, setMenuAberto] = useState(false);

  const status = conversa.support_chat_status_id;
  const aguardando =
    status === SupportChatStatusId.AGUARDANDO || status === SupportChatStatusId.EM_FILA;
  const emAndamento = status === SupportChatStatusId.EM_ANDAMENTO;
  const souODono = podeAgirNoAtendimento(conversa, usuarioId);

  const iniciar = async () => {
    try {
      setIniciando(true);

      const atualizado = await FetchReq<SupportChatsResponse>({
        endpoint: 'IniciarAtendimentoChat',
        variables: [conversa.id],
      });

      updateChat(atualizado);
    } catch (erro) {
      CatchAlerta(erro, 'Não foi possível iniciar o atendimento');
    } finally {
      setIniciando(false);
    }
  };

  const marcarNaoLida = async () => {
    try {
      const atualizado = await FetchReq<SupportChatsResponse>({
        endpoint: 'MarcarConversaNaoLida',
        variables: [conversa.id],
      });

      updateChat(atualizado);
    } catch (erro) {
      CatchAlerta(erro, 'Não foi possível marcar como não lida');
    }
  };

  /** As ações possíveis no estado atual. Vazio esconde o botão. */
  const itens: MenuItem[] = [
    ...(aguardando
      ? [
          {
            label: 'Iniciar atendimento',
            icon: 'fa-regular fa-play',
            disabled: iniciando,
            command: iniciar,
          },
          {
            label: 'Finalizar sem atendimento',
            icon: 'fa-regular fa-ban',
            command: () => setModalFinalizar('sem-atendimento'),
          },
        ]
      : []),

    ...(emAndamento && souODono
      ? [
          {
            label: 'Finalizar',
            icon: 'fa-regular fa-check',
            command: () => setModalFinalizar('normal'),
          },
          {
            label: 'Finalizar sem despedida',
            icon: 'fa-regular fa-circle-check',
            command: () => setModalFinalizar('sem-despedida'),
          },
          { separator: true },
          {
            label: 'Transferir',
            icon: 'fa-regular fa-right-left',
            command: () => setTransferirAberto(true),
          },
        ]
      : []),

    // Sempre disponível, inclusive em conversa de outro atendente: é
    // sinalização de leitura, não ação sobre o atendimento.
    {
      label: 'Marcar como não lida',
      icon: 'fa-regular fa-envelope',
      command: marcarNaoLida,
    },

    // Abre o painel de detalhes, e não direto o formulário: é de lá que se
    // edita o contato e se associa o cliente, com os campos personalizados à
    // vista. Consultar é o caso mais comum; editar vem por um botão dentro.
    {
      label: 'Dados do contato',
      icon: 'fa-regular fa-user-pen',
      command: () => setDetalhesAberto(true),
    },
  ];

  /**
   * O contato salvo volta para a conversa da lista.
   *
   * Sem isto, corrigir o nome ou associar um cliente pelo painel não apareceria
   * na lista até o socket dar a volta - e associar cliente é pré-requisito para
   * finalizar, que é a ação seguinte.
   */
  const aoSalvarContato = (contato: ContactResponse) => {
    updateChat({ ...conversa, contact: contato });
    setContatoAberto(false);
  };

  return (
    // ⚠️ `stopPropagation` em tudo: o item inteiro da lista é clicável, e sem
    // isto abrir o menu abriria a conversa junto - que é o que este componente
    // existe para evitar.
    //
    // Sobreposto à direita do cartão, fora do fluxo: no fluxo, o botão
    // empurrava a hora e aparecia em todos os itens ao mesmo tempo. A
    // visibilidade fica no CSS (`.acoes-hover`), e não em estado de React, para
    // não re-renderizar a lista inteira a cada passagem do mouse.
    // Sem utilitários do PrimeFlex aqui: ele marca tudo com `!important`
    // (`.flex { display: flex !important }`), e misturar isso com as regras de
    // visibilidade do `.acoes-conversa` tornava difícil prever quem vencia. O
    // posicionamento inteiro vive no SCSS, num lugar só.
    <span
      onClick={(e) => e.stopPropagation()}
      className={`acoes-conversa${menuAberto ? ' acoes-conversa--fixa' : ''}`}
    >
      <Menu
        ref={menuRef}
        model={itens}
        popupAlignment="right"
        popup
        onShow={() => setMenuAberto(true)}
        onHide={() => setMenuAberto(false)}
        style={{ width: 'auto' }}
        pt={{ label: { className: 'white-space-nowrap' } }}
      />

      <Button
        icon="fa-regular fa-chevron-down"
        text
        rounded
        size="small"
        aria-label="Ações da conversa"
        onClick={(evento) => menuRef.current?.toggle(evento)}
      />

      <ModalFinalizarAtendimento
        visible={!!modalFinalizar}
        onHide={() => setModalFinalizar(null)}
        chat={conversa}
        modo={modalFinalizar ?? 'normal'}
        // Sem `fecharConversa`: a conversa nem estava aberta. O `updateChat`
        // tira-a da lista, que é o efeito visível aqui.
        onFinalizado={updateChat}
        onContatoAtualizado={() => {}}
      />

      <ModalTransferirAtendimento
        visible={transferirAberto}
        onHide={() => setTransferirAberto(false)}
        chat={conversa}
        onTransferido={updateChat}
      />

      <SidebarDetalhesContato
        visible={detalhesAberto}
        onHide={() => setDetalhesAberto(false)}
        contato={conversa.contact}
        // Esta conversa, e não a ativa: o painel foi aberto pela lista.
        onContatoAtualizado={(contato) => updateChat({ ...conversa, contact: contato })}
        onEditar={() => {
          // O painel fecha antes: os dois sobrepostos disputam o foco, e o
          // formulário ficaria atrás do que o abriu.
          setDetalhesAberto(false);
          setContatoAberto(true);
        }}
      />

      <ModalContatoChat
        visible={contatoAberto}
        onHide={() => setContatoAberto(false)}
        contato={conversa.contact}
        onConfirm={aoSalvarContato}
      />
    </span>
  );
};

export default AcoesConversa;
