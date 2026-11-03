'use client';

import { PrimeIcons } from 'primereact/api';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { IActionTable } from '@/components/AcoesDataTable';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import { useService } from '@/contexts/ServicesContext';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';
import { useAjustesAtendimento } from '@/hooks/useAjustesAtendimento';
import { ChatbotResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { AlertaCallback, CatchAlerta, ConfirmaAcao, sleep } from '@/service/Util';

import DtChatbots from './DtChatbots';
import ModalFormChatbot, { FormChatbot } from './ModalFormChatbot';

type DadosChatbotProps = {
  data: ChatbotResponse[];
};

export default function DadosChatbotSection({ data }: DadosChatbotProps) {
  const { ajustes } = useAjustesAtendimento();
  const [chatbots, setChatbots] = useState(data || []);
  const [chatbotAtivo, setChatbotAtivo] = useState<ChatbotResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const { setLoading } = useService();
  const { FetchReq } = useApi();
  const router = useRouter();
  const { podeAdicionar, podeEditar, podeExcluir, podeAcao, semPermissao } = usePermissoesModulo('chatbot');
  const podePublicar = podeAcao('publish');
  const [publicandoId, setPublicandoId] = useState<number | null>(null);
  const publicacaoEmAndamento = useRef(false);

  const AlternarPublicacao = async (chatbot: ChatbotResponse) => {
    if (!podePublicar || !ajustes.chatbot_habilitado || publicacaoEmAndamento.current) return;
    const publicado = chatbot.current_published_version_id != null;
    try {
      publicacaoEmAndamento.current = true;
      setPublicandoId(chatbot.id);
      const atualizado = await FetchReq<ChatbotResponse>({
        endpoint: publicado ? 'DespublicarFluxoChatbot' : 'PublicarFluxoChatbot', variables: [chatbot.id],
      });
      setChatbots((atuais) => atuais.map((item) => item.id === chatbot.id
        ? { ...item, current_published_version_id: atualizado.current_published_version_id } : item));
      AlertaCallback(publicado ? 'Fluxo despublicado.' : 'Fluxo publicado.', () => {}, 'success');
    } catch (erro) {
      CatchAlerta(erro, publicado ? 'Não foi possível despublicar o fluxo' : 'Não foi possível publicar o fluxo');
    } finally {
      publicacaoEmAndamento.current = false;
      setPublicandoId(null);
    }
  };

  const ConfirmarPublicacao = (chatbot: ChatbotResponse) => {
    if (!podePublicar || publicacaoEmAndamento.current) return;
    const publicado = chatbot.current_published_version_id != null;
    ConfirmaAcao(<span>{publicado
      ? `O fluxo "${chatbot.name}" deixará de iniciar novas execuções. O status ativo/inativo não será alterado.`
      : `Publicar o último rascunho salvo de "${chatbot.name}"? Alterações ainda não salvas no editor não serão incluídas.`}</span>,
    AlternarPublicacao, chatbot, publicado ? 'Despublicar fluxo?' : 'Publicar fluxo?', publicado ? 'Despublicar' : 'Publicar', 'Cancelar');
  };

  const ButtonsHeader: IButtonsOthers[] = [
    {
      label: 'Novo chatbot',
      icon: PrimeIcons.PLUS,
      action: () => AbrirModal(null),
      disabled: !podeAdicionar,
      tooltip: podeAdicionar ? undefined : semPermissao,
    },
  ];

  const acoesTable: IActionTable<ChatbotResponse>[] = [
    {
      label: podeEditar ? 'Editar fluxo' : 'Visualizar fluxo',
      tooltip: podeEditar ? 'Abrir o editor de fluxo' : 'Consultar o fluxo sem alterar',
      icon: PrimeIcons.SITEMAP,
      // O fluxo tem tela própria - o modal aqui só edita nome/tipo/canal.
      command: (chatbot) => router.push(`/chatbot/${chatbot.id}`),
    },
    {
      label: podeEditar ? 'Editar dados' : 'Visualizar',
      tooltip: podeEditar ? 'Editar nome, tipo e canal' : 'Ver dados',
      icon: podeEditar ? PrimeIcons.PENCIL : PrimeIcons.EYE,
      command: (chatbot) => AbrirModal(chatbot),
    },
    {
      isHidden: () => !podeExcluir,
      label: 'Remover',
      tooltip: 'Remover chatbot',
      icon: PrimeIcons.TRASH,
      bgcolor: 'danger',
      command: (chatbot) =>
        ConfirmaAcao(
          `O chatbot "${chatbot.name}" será removido.`,
          RemoverChatbot,
          chatbot,
          'Remover chatbot?',
          'Remover',
          'Cancelar',
        ),
    },
  ];

  const AbrirModal = (chatbot: ChatbotResponse | null) => {
    setChatbotAtivo(chatbot);
    setModalVisible(true);
  };

  const FecharModal = async () => {
    setModalVisible(false);
    await sleep(1 / 2);
    setChatbotAtivo(null);
  };

  const ListarChatbots = async (use_loading = true) => {
    try {
      if (use_loading) setLoading(true);
      setChatbots(await FetchReq<ChatbotResponse[]>('ListarChatbots'));
    } catch (err) {
      CatchAlerta(err, 'Erro ao consultar chatbots');
    } finally {
      if (use_loading) setLoading(false);
    }
  };

  const SalvarChatbot = async (fields: FormChatbot) => {
    try {
      setLoading(true);

      const body = {
        name: fields.name,
        type: fields.type,
      };

      if (chatbotAtivo?.id) {
        await FetchReq({ endpoint: 'AtualizarChatbot', variables: [chatbotAtivo.id], body });
      } else {
        await FetchReq({ endpoint: 'AdicionarChatbot', body });
      }

      await FecharModal();
      await ListarChatbots(false);

      AlertaCallback('Chatbot salvo com sucesso!', () => {}, 'success');
    } catch (err) {
      CatchAlerta(err, 'Erro ao salvar chatbot');
    } finally {
      setLoading(false);
    }
  };

  const RemoverChatbot = async (chatbot: ChatbotResponse) => {
    try {
      setLoading(true);
      await FetchReq({ endpoint: 'RemoverChatbot', variables: [chatbot.id] });
      await ListarChatbots(false);
    } catch (err) {
      CatchAlerta(err, 'Não foi possível remover');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRendered(true);
  }, []);

  if (rendered && !ajustes.chatbot_habilitado) return <div>O módulo Chatbot está desabilitado nas configurações do sistema.</div>;

  return (
    rendered && (
      <>
        <TitleCards
          title="Chatbot"
          buttons={ButtonsHeader}
        />

        <div className="p-card-content">
          <DtChatbots
            actions={acoesTable}
            value={chatbots}
            podePublicar={podePublicar}
            publicandoId={publicandoId}
            onPublicacao={ConfirmarPublicacao}
          />
        </div>

        <ModalFormChatbot
          visible={modalVisible}
          onHide={FecharModal}
          data={chatbotAtivo}
          onConfirm={SalvarChatbot}
        />
      </>
    )
  );
}
