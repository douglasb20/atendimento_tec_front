'use client';

import { PrimeIcons } from 'primereact/api';
import { useEffect, useState } from 'react';

import { IActionTable } from '@/components/AcoesDataTable';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import { useService } from '@/contexts/ServicesContext';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';
import { ServiceAlertForm, ServiceAlertResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { AlertaCallback, CatchAlerta, ConfirmaAcao, sleep } from '@/service/Util';

import DtAvisos from './DtAvisos';
import ModalFormAviso from './ModalFormAviso';

type DadosAvisosProps = {
  data: ServiceAlertResponse[];
};

export default function DadosAvisosSection({ data }: DadosAvisosProps) {
  const [avisos, setAvisos] = useState(data || []);
  const [avisoAtivo, setAvisoAtivo] = useState<ServiceAlertResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const { setLoading } = useService();
  const { FetchReq } = useApi();
  const { podeAdicionar, podeEditar, podeExcluir, semPermissao } =
    usePermissoesModulo('service.alert');

  const ButtonsHeader: IButtonsOthers[] = [
    {
      label: 'Novo aviso',
      icon: PrimeIcons.PLUS,
      action: () => AbrirModal(null),
      disabled: !podeAdicionar,
      tooltip: podeAdicionar ? undefined : semPermissao,
    },
  ];

  const acoesTable: IActionTable<ServiceAlertResponse>[] = [
    {
      // Sempre visível: sem `:update` o cadastro abre em somente leitura.
      label: podeEditar ? 'Editar' : 'Visualizar',
      tooltip: podeEditar ? 'Editar aviso' : 'Ver aviso',
      icon: podeEditar ? PrimeIcons.PENCIL : PrimeIcons.EYE,
      command: (aviso) => AbrirModal(aviso),
    },
    {
      isHidden: () => !podeExcluir,
      label: 'Remover',
      tooltip: 'Remover aviso',
      icon: PrimeIcons.TRASH,
      bgcolor: 'danger',
      command: (aviso) =>
        ConfirmaAcao(
          `O aviso "${aviso.titulo}" será removido.`,
          RemoverAviso,
          aviso,
          'Remover aviso?',
          'Remover',
          'Cancelar',
        ),
    },
  ];

  const AbrirModal = (aviso: ServiceAlertResponse | null) => {
    setAvisoAtivo(aviso);
    setModalVisible(true);
  };

  const FecharModal = async () => {
    setModalVisible(false);
    await sleep(1 / 2);
    setAvisoAtivo(null);
  };

  const ListarAvisos = async (use_loading = true) => {
    try {
      if (use_loading) setLoading(true);
      setAvisos(await FetchReq<ServiceAlertResponse[]>('ListarAvisos'));
    } catch (err) {
      CatchAlerta(err, 'Erro ao consultar os avisos');
    } finally {
      if (use_loading) setLoading(false);
      setRendered(true);
    }
  };

  const SalvarAviso = async (fields: ServiceAlertForm) => {
    try {
      setLoading(true);

      const body = {
        titulo: fields.titulo.trim(),
        mensagem: fields.mensagem,
        ativo: fields.ativo,
        expira_em: fields.expira_em ?? null,
        // Sempre enviado: array vazio volta a valer para todos os canais, e
        // omitir preservaria os vínculos - quem desmarcou todos quis limpar.
        channel_ids: fields.channel_ids ?? [],
      };

      if (avisoAtivo?.id) {
        await FetchReq({ endpoint: 'AtualizarAviso', variables: [avisoAtivo.id], body });
      } else {
        await FetchReq({ endpoint: 'AdicionarAviso', body });
      }

      await FecharModal();
      await ListarAvisos(false);

      AlertaCallback('Aviso salvo com sucesso!', () => {}, 'success');
    } catch (err) {
      CatchAlerta(err, 'Erro ao salvar o aviso');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Liga e desliga da própria listagem.
   *
   * Otimista: o switch vira na hora e a lista recarrega depois. Durante um
   * incidente a pessoa desliga o aviso e quer ver o efeito imediato; esperar a
   * ida ao servidor faria o switch parecer travado.
   */
  const AlternarAtivo = async (aviso: ServiceAlertResponse, ativo: boolean) => {
    setAvisos((atuais) => atuais.map((a) => (a.id === aviso.id ? { ...a, ativo } : a)));

    try {
      await FetchReq({
        endpoint: 'AlternarAvisoAtivo',
        variables: [aviso.id],
        body: { ativo },
      });
    } catch (err) {
      // Desfaz o otimismo: sem isto o switch mostraria um estado que o
      // servidor recusou.
      setAvisos((atuais) =>
        atuais.map((a) => (a.id === aviso.id ? { ...a, ativo: aviso.ativo } : a)),
      );
      CatchAlerta(err, 'Não foi possível alterar o aviso');
    }
  };

  const RemoverAviso = async (aviso: ServiceAlertResponse) => {
    try {
      setLoading(true);
      await FetchReq({ endpoint: 'RemoverAviso', variables: [aviso.id] });
      await sleep(1);
      await ListarAvisos(false);
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
          title="Avisos"
          buttons={ButtonsHeader}
        />

        <p className="mt-0 mb-4 text-color-secondary">
          Mensagens enviadas logo após a saudação, na abertura de um atendimento novo. Servem para
          comunicar um problema em curso &mdash; um serviço fora do ar, uma manutenção &mdash; sem
          precisar mexer na saudação do canal.
        </p>

        <div className="p-card-content">
          <DtAvisos
            actions={acoesTable}
            value={avisos}
            onAlternarAtivo={AlternarAtivo}
            podeAlternar={podeEditar}
          />
        </div>

        <ModalFormAviso
          visible={modalVisible}
          onHide={FecharModal}
          data={avisoAtivo}
          onConfirm={SalvarAviso}
        />
      </>
    )
  );
}
