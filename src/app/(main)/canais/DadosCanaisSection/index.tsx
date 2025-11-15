'use client';
import { parseCookies } from 'nookies';
import { PrimeIcons } from 'primereact/api';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

import { ChannelResponse } from '@/Interfaces';
import { useService } from '@/contexts/ServicesContext';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta, ConfirmaAcao, sleep } from '@/service/Util';

import { IActionTable } from '@/components/AcoesDataTable';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';

import DtCanais from './DtCanais';
import ModalConfigChannel from './ModalConfigChannel';
import ModalForm from './ModalForm';

type DadosCanaisProps = {
  data: ChannelResponse[];
};

export default function DadosCanaisSection({ data }: DadosCanaisProps) {
  const [canais, setCanais] = useState(data || []);
  const [activeChannel, setActiveChannel] = useState<ChannelResponse | null>(null);
  const [modalVisible, setModalVisible] = useState({
    configChannel: false,
    formChannel: false,
  });

  const [rendered, setRendered] = useState(false);
  const { setLoading } = useService();
  const { FetchReq } = useApi();
  const activeChannelRef = useRef<ChannelResponse | null>(null);

  const ButtonsHeader: IButtonsOthers[] = [
    {
      label: 'Adicionar canal',
      icon: PrimeIcons.PLUS,
      action: () => AbrirModalForm(null),
      bgColor: 'primary p-button-outlined',
    },
  ];

  const acoesTable: IActionTable<ChannelResponse>[] = [
    {
      label: 'Editar canal',
      tooltip: 'Editar canal',
      icon: 'pi pi-fw pi-file-edit',
      bgcolor: 'primary py-2',
      command: (data) => AbrirModalForm(data),
    },
    {
      label: 'Configurar canal',
      tooltip: 'Configurar canal',
      icon: 'pi pi-fw pi-cog',
      bgcolor: 'info py-2',
      command: (data) => AbrirModalConfig(data.id!),
    },
    {
      label: 'Excluir canal',
      tooltip: 'Excluir canal',
      icon: 'pi pi-fw pi-times',
      bgcolor: 'danger py-2',
      command: (data) => ConfirmaAcao('Confirma remover este canal?', RemoverCanal, data),
    },
  ];

  const onSubmitForm = async (data: Pick<ChannelResponse, 'name' | 'id'>) => {
    try {
      setLoading();
      if (!data?.id) {
        await FetchReq({
          endpoint: 'AdicionarCanal',
          body: {
            name: data.name,
          },
        });
      } else {
        await FetchReq({
          endpoint: 'AtualizarCanal',
          variables: [data.id],
          body: {
            name: data.name,
          },
        });
      }
      await ReloadCanais();
      await FecharModalForm();
    } catch (err) {
      CatchAlerta(err, 'Erro ao salvar canal');
    } finally {
      setLoading(false);
    }
  };

  const AbrirModalForm = async (canal: ChannelResponse = null) => {
    setActiveChannel(canal);
    setModalVisible((prev) => ({ ...prev, formChannel: true }));
  };

  const FecharModalForm = async () => {
    setModalVisible((prev) => ({ ...prev, formChannel: false }));
    await sleep(1 / 2);
    setActiveChannel(null);
  };

  const AbrirModalConfig = async (id: number) => {
    await BuscarCanal(id);
    setModalVisible((prev) => ({ ...prev, configChannel: true }));
  };

  const FecharModalConfig = async () => {
    setModalVisible((prev) => ({ ...prev, configChannel: false }));
    await sleep(1 / 2);
    setActiveChannel(null);
  };

  const ReloadCanais = async (use_loading = true): Promise<void> => {
    try {
      if (use_loading) setLoading(true);
      const data = await FetchReq<ChannelResponse[]>('ListarCanais');
      setCanais(data);
    } catch (err) {
      CatchAlerta(err, 'Erro ao consultar canais');
    } finally {
      if (use_loading) setLoading(false);
      setRendered(true);
    }
  };

  const BuscarCanal = async (id: number, use_loading = true): Promise<ChannelResponse | null> => {
    try {
      if (use_loading) setLoading(true);
      const data = await FetchReq<ChannelResponse>('BuscarCanal', [id]);
      setActiveChannel(data);
    } catch (err) {
      CatchAlerta(err, 'Erro ao buscar canal');
      return null;
    } finally {
      if (use_loading) setLoading(false);
    }
  };

  const RemoverCanal = async (data: ChannelResponse): Promise<void> => {
    try {
      setLoading(true);
      await FetchReq('RemoverCanal', [data.id]);
      await sleep(1);
      await ReloadCanais();
    } catch (err) {
      CatchAlerta(err, 'Erro ao remover canal.');
    } finally {
      setLoading(false);
    }
  };

  const onMessageChannelStatus = (data: { channel_id: number }) => {
    ReloadCanais(false);
    if (activeChannelRef.current && data.channel_id === activeChannelRef.current.id) {
      BuscarCanal(data.channel_id, false);
    }
  };

  const onStartSession = async () => {
    try {
      if (activeChannel) {
        // Inicia a sessão para o canal ativo
        await FetchReq('IniciarSessao', [activeChannel.id]);
      }
    } catch (err) {
      CatchAlerta(err, 'Erro ao iniciar sessão.');
    }
  };

  const onDisconnectSession = async () => {
    try {
      if (activeChannel) {
        // Inicia a sessão para o canal ativo
        await FetchReq('FinalizarSessao', [activeChannel.id]);
      }
    } catch (err) {
      CatchAlerta(err, 'Erro ao finalizar sessão.');
    }
  };

  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  useEffect(() => {
    const cookiesStore = parseCookies(null);
    const token = cookiesStore['token'];
    const socket = io('http://localhost:3001', {
      autoConnect: false, // Impede a conexão automática na inicialização
      auth: {
        token,
      },
    });
    // socketRef.current = socket;

    // Conecta apenas se não estiver já conectado
    if (!socket.connected) {
      socket.connect();
    }

    function onConnect() {
      console.log('✅ Conectado');
    }

    // Adiciona os listeners
    socket.on('connect', onConnect);

    // Remove listener antigo antes de adicionar
    socket.off('whatsapp:channel_status');
    socket.on('whatsapp:channel_status', onMessageChannelStatus);

    setRendered(true);
    return () => {
      // Remove os listeners para evitar memory leaks
      socket.off('connect', onConnect);
      socket.off('whatsapp:channel_status', onMessageChannelStatus);
      // Desconecta o socket
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    setRendered(true);
  }, []);
  return (
    rendered && (
      <>
        <TitleCards
          title="Lista de canais"
          buttons={ButtonsHeader}
        />

        <div className="p-card-content">
          <DtCanais
            actions={acoesTable}
            value={canais}
          />
        </div>
        <ModalConfigChannel
          visible={modalVisible.configChannel}
          value={activeChannel}
          onHide={FecharModalConfig}
          onStartSession={onStartSession}
          onDisconnectSession={onDisconnectSession}
        />
        <ModalForm
          visible={modalVisible.formChannel}
          value={activeChannel}
          onHide={FecharModalForm}
          onComplete={onSubmitForm}
        />
      </>
    )
  );
}
