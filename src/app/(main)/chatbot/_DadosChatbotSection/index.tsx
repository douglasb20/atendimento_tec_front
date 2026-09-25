'use client';

import { PrimeIcons } from 'primereact/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { IActionTable } from '@/components/AcoesDataTable';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import { useService } from '@/contexts/ServicesContext';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';
import { ChatbotResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { AlertaCallback, CatchAlerta, ConfirmaAcao, sleep } from '@/service/Util';

import DtChatbots from './DtChatbots';
import ModalFormChatbot, { FormChatbot } from './ModalFormChatbot';

type DadosChatbotProps = {
  data: ChatbotResponse[];
};

export default function DadosChatbotSection({ data }: DadosChatbotProps) {
  const [chatbots, setChatbots] = useState(data || []);
  const [chatbotAtivo, setChatbotAtivo] = useState<ChatbotResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const { setLoading } = useService();
  const { FetchReq } = useApi();
  const router = useRouter();
  const { podeAdicionar, podeEditar, podeExcluir, semPermissao } = usePermissoesModulo('chatbot');

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
      label: 'Editar fluxo',
      tooltip: 'Abrir o editor de fluxo',
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
        channel_id: fields.type === 'complementar' ? null : fields.channel_id,
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
