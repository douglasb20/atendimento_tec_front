'use client';

import { PrimeIcons } from 'primereact/api';
import { useEffect, useState } from 'react';

import { IActionTable } from '@/components/AcoesDataTable';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import { useService } from '@/contexts/ServicesContext';
import {
  IntegrationProviderResponse,
  IntegrationResponse,
  TesteConexaoResponse,
} from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { Alerta, AlertaCallback, CatchAlerta, ConfirmaAcao, sleep } from '@/service/Util';

import DtIntegracoes from './DtIntegracoes';
import ModalFormIntegracao, { FormIntegracao } from './ModalFormIntegracao';

type DadosIntegracoesProps = {
  data: IntegrationResponse[];
};

export default function DadosIntegracoesSection({ data }: DadosIntegracoesProps) {
  const [integracoes, setIntegracoes] = useState(data || []);
  const [providers, setProviders] = useState<IntegrationProviderResponse[]>([]);
  const [integracaoAtiva, setIntegracaoAtiva] = useState<IntegrationResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const { setLoading } = useService();
  const { FetchReq } = useApi();

  const ButtonsHeader: IButtonsOthers[] = [
    {
      label: 'Nova integração',
      icon: PrimeIcons.PLUS,
      action: () => AbrirModal(null),
    },
  ];

  const acoesTable: IActionTable<IntegrationResponse>[] = [
    {
      label: 'Testar',
      tooltip: 'Testar conexão',
      icon: PrimeIcons.BOLT,
      command: (integracao) => TestarConexao(integracao),
    },
    {
      label: 'Editar',
      tooltip: 'Editar integração',
      icon: PrimeIcons.PENCIL,
      command: (integracao) => AbrirModal(integracao),
    },
    {
      label: 'Remover',
      tooltip: 'Remover integração',
      icon: PrimeIcons.TRASH,
      bgcolor: 'danger',
      command: (integracao) =>
        ConfirmaAcao(
          `A integração "${integracao.name}" será removida.`,
          RemoverIntegracao,
          integracao,
          'Remover integração?',
          'Remover',
          'Cancelar',
        ),
    },
  ];

  const AbrirModal = (integracao: IntegrationResponse | null) => {
    setIntegracaoAtiva(integracao);
    setModalVisible(true);
  };

  const FecharModal = async () => {
    setModalVisible(false);
    await sleep(1 / 2);
    setIntegracaoAtiva(null);
  };

  const ListarProviders = async () => {
    try {
      const dados = await FetchReq<IntegrationProviderResponse[]>('ListarProvidersIntegracao');
      setProviders(dados ?? []);
    } catch (err) {
      CatchAlerta(err, 'Erro ao consultar os providers');
    }
  };

  const ListarIntegracoes = async (use_loading = true) => {
    try {
      if (use_loading) setLoading(true);
      const dados = await FetchReq<IntegrationResponse[]>('ListarIntegracoes');
      setIntegracoes(dados);
    } catch (err) {
      CatchAlerta(err, 'Erro ao consultar integrações');
    } finally {
      if (use_loading) setLoading(false);
      setRendered(true);
    }
  };

  /** Teste a partir da listagem, usando a credencial já gravada. */
  const TestarConexao = async (integracao: IntegrationResponse) => {
    try {
      setLoading(true);

      const resposta = await FetchReq<TesteConexaoResponse>({
        endpoint: 'TestarConexaoIntegracao',
        body: { integration_id: integracao.id },
      });

      Alerta(
        resposta.mensagem,
        resposta.ok ? 'Conexão em ordem' : 'Falha na conexão',
        resposta.ok ? 'success' : 'error',
      );
    } catch (err) {
      CatchAlerta(err, 'Não foi possível testar a conexão');
    } finally {
      setLoading(false);
    }
  };

  const SalvarIntegracao = async (fields: FormIntegracao) => {
    try {
      setLoading(true);

      const apiKey = fields.api_key?.trim();

      const body = {
        integration_provider_id: fields.integration_provider_id,
        name: fields.name,
        base_url: fields.base_url?.trim() || undefined,
        webhook_url: fields.webhook_url?.trim() || undefined,
        is_default: fields.is_default,
        is_active: fields.is_active,
        // Omitir preserva a credencial gravada (contrato do backend). O campo
        // agora vem preenchido com a chave atual, então só cai aqui quem a
        // apagou de propósito — e nesse caso manter a anterior é melhor que
        // gravar vazio e derrubar a integração por um apagão acidental.
        ...(apiKey && { credentials: { apiKey } }),
      };

      if (integracaoAtiva?.id) {
        await FetchReq({
          endpoint: 'AtualizarIntegracao',
          variables: [integracaoAtiva.id],
          body,
        });
      } else {
        await FetchReq({ endpoint: 'AdicionarIntegracao', body });
      }

      await FecharModal();
      await ListarIntegracoes(false);

      AlertaCallback('Integração salva com sucesso!', () => {}, 'success');
    } catch (err) {
      CatchAlerta(err, 'Erro ao salvar integração');
    } finally {
      setLoading(false);
    }
  };

  const RemoverIntegracao = async (integracao: IntegrationResponse) => {
    try {
      setLoading(true);
      await FetchReq({ endpoint: 'RemoverIntegracao', variables: [integracao.id] });
      await sleep(1);
      await ListarIntegracoes(false);
    } catch (err) {
      // Integração com canais vinculados volta 400 com a contagem na mensagem.
      CatchAlerta(err, 'Não foi possível remover');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    ListarProviders();
    setRendered(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    rendered && (
      <>
        <TitleCards
          title="Integrações"
          buttons={ButtonsHeader}
        />

        <div className="p-card-content">
          <DtIntegracoes
            actions={acoesTable}
            value={integracoes}
          />
        </div>

        <ModalFormIntegracao
          visible={modalVisible}
          onHide={FecharModal}
          data={integracaoAtiva}
          providers={providers}
          onConfirm={SalvarIntegracao}
        />
      </>
    )
  );
}
