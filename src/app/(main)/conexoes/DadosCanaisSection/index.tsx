'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { PrimeIcons } from 'primereact/api';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

import { ChannelResponse, ChannelStatusId } from '@/Interfaces';
import { useService } from '@/contexts/ServicesContext';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';
import useApi from '@/service/Api/ApiClient';
import { useCanaisRevalidacao } from '@/store/useCanaisRevalidacao';
import { Alerta, CatchAlerta, ConfirmaAcao, sleep } from '@/service/Util';

import { IActionTable } from '@/components/AcoesDataTable';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';

import DtCanais from './DtCanais';
import ModalConfigChannel from './ModalConfigChannel';
import ModalForm from './ModalForm';

type DadosCanaisProps = {
  data: ChannelResponse[];
};

export default function DadosCanaisSection({ data }: DadosCanaisProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invalidarCanais = useCanaisRevalidacao((s) => s.invalidarCanais);
  const [canais, setCanais] = useState(data || []);
  const [sincronizando, setSincronizando] = useState(false);
  const [activeChannel, setActiveChannel] = useState<ChannelResponse | null>(null);
  const [modalVisible, setModalVisible] = useState({
    configChannel: false,
    formChannel: false,
  });

  const [rendered, setRendered] = useState(false);
  const { setLoading } = useService();
  const { podeAdicionar, podeEditar, podeExcluir, podeAcao, semPermissao } =
    usePermissoesModulo('channel');

  // Conectar, desconectar e reiniciar a sessão do WhatsApp. Separada de
  // `channel:update` porque derrubar a conexão para o atendimento de todos -
  // é mais grave do que corrigir o nome do canal.
  const podeConfigurar = podeAcao('config');
  const { FetchReq } = useApi();
  const activeChannelRef = useRef<ChannelResponse | null>(null);

  // Sem permissão de criar, o botão não aparece: a chamada seria recusada
  // pelo backend de qualquer forma.
  const ButtonsHeader: IButtonsOthers[] = [
        {
          label: 'Adicionar canal',
          icon: PrimeIcons.PLUS,
          action: () => AbrirModalForm(null),
          bgColor: 'primary p-button-outlined',
          disabled: !podeAdicionar,
          tooltip: podeAdicionar ? undefined : semPermissao,
        },
  ];

  const acoesTable: IActionTable<ChannelResponse>[] = [
    {
      // Sempre visível: sem `:update` o cadastro abre em somente leitura.
      label: podeEditar ? 'Editar canal' : 'Visualizar canal',
      tooltip: podeEditar ? 'Editar canal' : 'Ver canal',
      icon: podeEditar ? 'pi pi-fw pi-file-edit' : 'pi pi-fw pi-eye',
      bgcolor: 'primary py-2',
      command: (data) => AbrirModalForm(data),
    },
    {
      // `channel:config`, não `:update`: o modal conecta e desconecta a
      // sessão. Escondido e não desabilitado porque não há o que ler ali - a
      // tela é de ações.
      isHidden: () => !podeConfigurar,
      label: 'Configurar canal',
      tooltip: 'Configurar canal',
      icon: 'pi pi-fw pi-cog',
      bgcolor: 'info py-2',
      command: (data) => AbrirModalConfig(data.id!),
    },
    {
      // Só em canal conectado: a Evolution recusa reiniciar sessão fechada, e
      // desconectado é caso de conectar, não de reiniciar.
      isHidden: (data) =>
        !podeConfigurar || data?.channel_status_id !== ChannelStatusId.CONECTADO,
      label: 'Reiniciar conexão',
      tooltip: 'Reiniciar conexão',
      icon: 'pi pi-fw pi-refresh',
      bgcolor: 'warning py-2',
      command: (data) =>
        ConfirmaAcao(
          'A conexão cai por alguns segundos e volta sozinha. Confirma reiniciar?',
          ReiniciarCanal,
          data,
        ),
    },
    {
      isHidden: () => !podeExcluir,
      label: 'Excluir canal',
      tooltip: 'Excluir canal',
      icon: 'pi pi-fw pi-times',
      bgcolor: 'danger py-2',
      command: (data) => ConfirmaAcao('Confirma remover este canal?', RemoverCanal, data),
    },
  ];

  const onSubmitForm = async (
    data: Pick<
      ChannelResponse,
      'name' | 'id' | 'integration_id' | 'mensagem_saudacao' | 'mensagem_despedida' | 'department_ids'
    >,
  ) => {
    try {
      setLoading();
      // `integration_id` vai junto: o dropdown existia na tela e o valor
      // escolhido nunca chegava à API - todo canal era salvo como "usar a
      // integração padrão", qualquer que fosse a escolha.
      const corpo = {
        name: data.name,
        integration_id: data.integration_id ?? null,
        // Vazio vira nulo: é como o backend entende "não enviar", e guardar
        // string vazia faria a coluna ter dois jeitos de dizer a mesma coisa.
        mensagem_saudacao: data.mensagem_saudacao?.trim() || null,
        mensagem_despedida: data.mensagem_despedida?.trim() || null,
        department_ids: data.department_ids ?? [],
      };

      if (!data?.id) {
        await FetchReq({ endpoint: 'AdicionarCanal', body: corpo });
      } else {
        await FetchReq({
          endpoint: 'AtualizarCanal',
          variables: [data.id],
          body: corpo,
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

  const ReiniciarCanal = async (canal: ChannelResponse) => {
    try {
      setLoading();
      await FetchReq({ endpoint: 'ReiniciarCanal', variables: [canal.id] });
      // Sem recarregar a lista: o estado real chega pelo socket
      // `whatsapp:channel_status`, que a Evolution dispara ao derrubar e ao
      // subir de novo. Buscar agora pegaria o estado de antes da queda.
      Alerta('Reiniciando a conexão...', 'Aviso', 'success');
    } catch (err) {
      CatchAlerta(err, 'Erro ao reiniciar a conexão');
    } finally {
      setLoading(false);
    }
  };

  const AbrirModalForm = async (canal: ChannelResponse = null) => {
    // A listagem não traz `departments` (custaria o join em toda consulta -
    // ver `findChannelComSetores`); reconsulta o canal individual para o
    // MultiSelect de setores abrir pré-marcado.
    if (canal?.id) {
      await BuscarCanal(canal.id, false);
    } else {
      setActiveChannel(canal);
    }
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
      // O badge do topbar observa esta versão: criar e excluir canal não
      // passam pelo socket, então sem o aviso ele seguiria contando um canal
      // que já não existe.
      invalidarCanais();
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

  /**
   * Pergunta ao provider qual o estado real da sessão e alinha o registro.
   *
   * O status exibido vem do último `connection.update` recebido; quando esse
   * evento se perde, o portal mostra "Conectado" para um canal que caiu e a
   * falha só aparece na hora de enviar.
   */
  const onSincronizarStatus = async () => {
    if (!activeChannel) return;

    try {
      setSincronizando(true);
      const atualizado = await FetchReq<ChannelResponse>('SincronizarStatusCanal', [
        activeChannel.id,
      ]);

      // O nome do status pode faltar se a relação não veio carregada; aí o
      // recurso é a listagem, que sempre a traz. Antes o texto caía direto em
      // "desconhecido" e o aviso ficava sem sentido para quem via o status na
      // tela um instante antes.
      const nomeDoStatus = (canal: ChannelResponse) =>
        canal?.channelStatus?.name ??
        canais.find((c) => c.id === canal?.id)?.channelStatus?.name ??
        'desconhecido';

      const anterior = nomeDoStatus(activeChannel);
      const atual = nomeDoStatus(atualizado);
      const mudou = atualizado.channel_status_id !== activeChannel.channel_status_id;

      setActiveChannel(atualizado);
      await ReloadCanais(false);

      Alerta(
        mudou
          ? `O canal estava marcado como "${anterior}" e na verdade está "${atual}". O registro foi corrigido.`
          : `O status continua "${atual}".`,
        mudou ? 'Status corrigido' : 'Status confirmado',
        mudou ? 'warning' : 'success',
      );
    } catch (err) {
      CatchAlerta(err, 'Não foi possível consultar o status');
    } finally {
      setSincronizando(false);
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

  // `/canais?canal=<id>` abre direto a configuração daquele canal - é como o
  // badge de status do topbar leva o atendente até aqui. O parâmetro é
  // removido em seguida para o modal não reabrir a cada voltar/avançar.
  useEffect(() => {
    const id = Number(searchParams.get('canal'));
    if (!id) return;

    AbrirModalConfig(id);
    router.replace('/canais');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    // Mesma origem do `socketSlice`: cravar a URL aqui funcionava só em
    // desenvolvimento - em produção o QR nunca chegaria, porque é por este
    // socket que vem o `whatsapp:channel_status`.
    const socket = io(process.env.WEBSOCKET_HOST || '', {
      autoConnect: false, // Impede a conexão automática na inicialização
      // O token é cookie httpOnly e o JS não o lê; o navegador o envia no
      // handshake por causa do `withCredentials`.
      withCredentials: true,
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
          onSincronizarStatus={onSincronizarStatus}
          sincronizando={sincronizando}
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
