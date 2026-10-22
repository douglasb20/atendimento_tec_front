'use client';

import { PrimeIcons } from 'primereact/api';
import { useEffect, useState } from 'react';

import { IActionTable } from '@/components/AcoesDataTable';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import { useService } from '@/contexts/ServicesContext';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';
import { HolidayResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { AlertaCallback, CatchAlerta, ConfirmaAcao, sleep } from '@/service/Util';

import DtFeriados from './DtFeriados';
import ModalFormFeriado, { FormFeriado } from './ModalFormFeriado';

type DadosFeriadosProps = {
  data: HolidayResponse[];
};

export default function DadosFeriadosSection({ data }: DadosFeriadosProps) {
  const [feriados, setFeriados] = useState(data || []);
  const [feriadoAtivo, setFeriadoAtivo] = useState<HolidayResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const { setLoading } = useService();
  const { FetchReq } = useApi();
  const { podeAdicionar, podeEditar, podeExcluir, semPermissao } =
    usePermissoesModulo('holiday');

  const ButtonsHeader: IButtonsOthers[] = [
    {
      label: 'Novo feriado',
      icon: PrimeIcons.PLUS,
      action: () => AbrirModal(null),
      disabled: !podeAdicionar,
      tooltip: podeAdicionar ? undefined : semPermissao,
    },
  ];

  const acoesTable: IActionTable<HolidayResponse>[] = [
    {
      label: podeEditar ? 'Editar' : 'Visualizar',
      tooltip: podeEditar ? 'Editar feriado' : 'Ver feriado',
      icon: podeEditar ? PrimeIcons.PENCIL : PrimeIcons.EYE,
      command: (feriado) => AbrirModal(feriado),
    },
    {
      isHidden: (feriado) => !podeExcluir || feriado.is_system,
      label: 'Remover',
      tooltip: 'Remover feriado',
      icon: PrimeIcons.TRASH,
      bgcolor: 'danger',
      command: (feriado) =>
        ConfirmaAcao(
          `O feriado "${feriado.name}" será removido.`,
          RemoverFeriado,
          feriado,
          'Remover feriado?',
          'Remover',
          'Cancelar',
        ),
    },
  ];

  const AbrirModal = (feriado: HolidayResponse | null) => {
    setFeriadoAtivo(feriado);
    setModalVisible(true);
  };

  const FecharModal = async () => {
    setModalVisible(false);
    await sleep(1 / 2);
    setFeriadoAtivo(null);
  };

  const ListarFeriados = async (use_loading = true) => {
    try {
      if (use_loading) setLoading(true);
      setFeriados(await FetchReq<HolidayResponse[]>('ListarFeriados'));
    } catch (err) {
      CatchAlerta(err, 'Erro ao consultar feriados');
    } finally {
      if (use_loading) setLoading(false);
    }
  };

  const SalvarFeriado = async (fields: FormFeriado) => {
    try {
      setLoading(true);

      // Feriado nacional (seed): só o nome é editável - a data é fixa e o
      // backend recusa qualquer tentativa de mudá-la, então nem a envia.
      const body = feriadoAtivo?.is_system
        ? { name: fields.name }
        : {
            name: fields.name,
            recurring: fields.recurring,
            // Ano só importa para feriado de data completa - recorrente
            // ignora o que o `Calendar` mostrou, igual o backend faz ao gravar.
            ...(fields.recurring ? {} : { year: fields.date.getFullYear() }),
            month: fields.date.getMonth() + 1,
            day: fields.date.getDate(),
          };

      if (feriadoAtivo?.id) {
        await FetchReq({ endpoint: 'AtualizarFeriado', variables: [feriadoAtivo.id], body });
      } else {
        await FetchReq({ endpoint: 'AdicionarFeriado', body });
      }

      await FecharModal();
      await ListarFeriados(false);

      AlertaCallback('Feriado salvo com sucesso!', () => {}, 'success');
    } catch (err) {
      CatchAlerta(err, 'Erro ao salvar feriado');
    } finally {
      setLoading(false);
    }
  };

  const RemoverFeriado = async (feriado: HolidayResponse) => {
    try {
      setLoading(true);
      await FetchReq({ endpoint: 'RemoverFeriado', variables: [feriado.id] });
      await ListarFeriados(false);
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
          title="Feriados"
          buttons={ButtonsHeader}
        />

        <div className="p-card-content">
          <DtFeriados
            actions={acoesTable}
            value={feriados}
          />
        </div>

        <ModalFormFeriado
          visible={modalVisible}
          onHide={FecharModal}
          data={feriadoAtivo}
          onConfirm={SalvarFeriado}
        />
      </>
    )
  );
}
