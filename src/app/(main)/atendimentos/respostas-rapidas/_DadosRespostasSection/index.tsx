'use client';

import { PrimeIcons } from 'primereact/api';
import { useEffect, useState } from 'react';

import { IActionTable } from '@/components/AcoesDataTable';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import { useService } from '@/contexts/ServicesContext';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';
import { useSalvarRespostaRapida } from '@/hooks/useSalvarRespostaRapida';
import { QuickReplyForm, QuickReplyResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { AlertaCallback, CatchAlerta, ConfirmaAcao, sleep } from '@/service/Util';

import DtRespostas from './DtRespostas';
import ModalFormResposta from './ModalFormResposta';

type DadosRespostasProps = {
  data: QuickReplyResponse[];
};

export default function DadosRespostasSection({ data }: DadosRespostasProps) {
  const [respostas, setRespostas] = useState(data || []);
  const [respostaAtiva, setRespostaAtiva] = useState<QuickReplyResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const { setLoading } = useService();
  const { FetchReq } = useApi();
  const { salvar } = useSalvarRespostaRapida();
  const { podeAdicionar, podeEditar, podeExcluir, semPermissao } =
    usePermissoesModulo('quick.reply');

  const ButtonsHeader: IButtonsOthers[] = [
        {
          label: 'Nova resposta',
          icon: PrimeIcons.PLUS,
          action: () => AbrirModal(null),
          disabled: !podeAdicionar,
          tooltip: podeAdicionar ? undefined : semPermissao,
        },
  ];

  const acoesTable: IActionTable<QuickReplyResponse>[] = [
    {
      // Sempre visível: sem `:update` o cadastro abre em somente leitura.
      label: podeEditar ? 'Editar' : 'Visualizar',
      tooltip: podeEditar ? 'Editar resposta' : 'Ver resposta',
      icon: podeEditar ? PrimeIcons.PENCIL : PrimeIcons.EYE,
      command: (resposta) => AbrirModal(resposta),
    },
    {
      isHidden: () => !podeExcluir,
      label: 'Remover',
      tooltip: 'Remover resposta',
      icon: PrimeIcons.TRASH,
      bgcolor: 'danger',
      command: (resposta) =>
        ConfirmaAcao(
          `A resposta "/${resposta.atalho}" será removida.`,
          RemoverResposta,
          resposta,
          'Remover resposta rápida?',
          'Remover',
          'Cancelar',
        ),
    },
  ];

  const AbrirModal = (resposta: QuickReplyResponse | null) => {
    setRespostaAtiva(resposta);
    setModalVisible(true);
  };

  const FecharModal = async () => {
    setModalVisible(false);
    await sleep(1 / 2);
    setRespostaAtiva(null);
  };

  const ListarRespostas = async (use_loading = true) => {
    try {
      if (use_loading) setLoading(true);
      setRespostas(await FetchReq<QuickReplyResponse[]>('ListarRespostasRapidas'));
    } catch (err) {
      CatchAlerta(err, 'Erro ao consultar as respostas rápidas');
    } finally {
      if (use_loading) setLoading(false);
      setRendered(true);
    }
  };

  const SalvarResposta = async (
    fields: QuickReplyForm,
    arquivoNovo: File | null,
    removeuAnexo: boolean,
  ) => {
    try {
      await salvar(fields, arquivoNovo, removeuAnexo, respostaAtiva);

      await FecharModal();
      await ListarRespostas(false);

      AlertaCallback('Resposta rápida salva com sucesso!', () => {}, 'success');
    } catch (err) {
      // Atalho repetido volta 409 com mensagem própria; o `CatchAlerta` a
      // exibe em vez do texto genérico.
      CatchAlerta(err, 'Erro ao salvar a resposta rápida');
    }
  };

  const RemoverResposta = async (resposta: QuickReplyResponse) => {
    try {
      setLoading(true);
      await FetchReq({ endpoint: 'RemoverRespostaRapida', variables: [resposta.id] });
      await sleep(1);
      await ListarRespostas(false);
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
          title="Respostas rápidas"
          buttons={ButtonsHeader}
        />

        <p className="mt-0 mb-4 text-color-secondary">
          Mensagens prontas que a equipe insere no chat digitando &ldquo;/&rdquo; seguido do
          atalho.
        </p>

        <div className="p-card-content">
          <DtRespostas
            actions={acoesTable}
            value={respostas}
          />
        </div>

        <ModalFormResposta
          visible={modalVisible}
          onHide={FecharModal}
          data={respostaAtiva}
          onConfirm={SalvarResposta}
        />
      </>
    )
  );
}
