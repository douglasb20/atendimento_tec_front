'use client';
import React, { useEffect, useState } from 'react';
import { PrimeIcons } from 'primereact/api';
import { useRouter } from 'next/navigation';

import { AtendimentosResponse, IUsuariosResponse } from '@/Interfaces';
import { useService } from '@/contexts/ServicesContext';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import { IActionTable } from '@/components/AcoesDataTable';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta, ConfirmaAcao, DateToBR, sleep } from '@/service/Util';
import DtAtendimento from './DtAtendimentos';
import FiltrosDados from './FiltrosDados';
import { startOfMonth } from 'date-fns';

type DadosAtendimentoProps = {
  data: AtendimentosResponse[];
  users: IUsuariosResponse[];
  currentUser: number;
};

interface FiltroForm {
  user_id: number;
  data_inicio: Date;
  data_fim: Date;
}

export default function DadosAtendimentoSection({
  data,
  users,
  currentUser,
}: DadosAtendimentoProps) {
  const [atendimentos, setAtendimentos] = useState(data || []);

  const [rendered, setRendered] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<FiltroForm>({
    user_id: currentUser,
    data_inicio: startOfMonth(new Date()),
    data_fim: new Date(),
  });
  const { setLoading } = useService();
  const { FetchReq } = useApi();
  const router = useRouter();

  const ButtonsHeader: IButtonsOthers[] = [
    {
      label: 'Adicionar atendimento',
      // @ts-ignore
      icon: PrimeIcons.FILE_EDIT,
      action: () => router.push('/atendimentos/form/'),
      bgColor: 'primary p-button-outlined',
    },
  ];

  const acoesTable: IActionTable<AtendimentosResponse>[] = [
    {
      label: 'Editar atendimento',
      tooltip: 'Editar atendimento',
      icon: 'pi pi-fw pi-user-edit',
      bgcolor: 'primary py-2',
      command: (data) => router.push('/atendimentos/form/' + data.id),
    },
    {
      label: 'Excluir atendimento',
      tooltip: 'Excluir atendimento',
      icon: 'pi pi-fw pi-times',
      bgcolor: 'danger py-2',
      command: (data) =>
        ConfirmaAcao('Confirma remover este atendimento?', RemoverAtendimento, data),
    },
  ];

  const ReloadAtendimentos = async (
    userId: number,
    data_inicio: Date,
    data_fim: Date,
  ): Promise<void> => {
    try {
      setLoading(true);
      const data = await FetchReq<AtendimentosResponse[]>('ListarAtendimentosPorData', [
        userId,
        DateToBR(data_inicio, 'yyyy-MM-dd'),
        DateToBR(data_fim, 'yyyy-MM-dd'),
      ]);
      setAtendimentos(data);
      setCurrentFilter({ user_id: userId, data_inicio, data_fim });
    } catch (err) {
      CatchAlerta(err, 'Erro ao consultar atendimentos');
    } finally {
      setLoading(false);
      setRendered(true);
    }
  };

  const RemoverAtendimento = async (data: AtendimentosResponse): Promise<void> => {
    try {
      setLoading(true);
      await FetchReq('RemoverAtendimento', [data.id]);
      await sleep(1);
      await ReloadAtendimentos(
        currentFilter.user_id,
        currentFilter.data_inicio,
        currentFilter.data_fim,
      );
    } catch (err) {
      setLoading(false);
      CatchAlerta(err, 'Erro ao remover atendimento.');
    }
  };

  useEffect(() => {
    setRendered(true);
  }, []);
  return (
    rendered && (
      <>
        <TitleCards
          title="Lista de atendimentos"
          buttons={ButtonsHeader}
        />

        <div className="p-card-content">
          <FiltrosDados
            users={users}
            currentUser={currentUser}
            onSubmitFilter={ReloadAtendimentos}
          />
          <DtAtendimento
            actions={acoesTable}
            value={atendimentos}
          />
        </div>
      </>
    )
  );
}
