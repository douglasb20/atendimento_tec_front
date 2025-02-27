'use client';
import React, { useEffect, useState } from 'react';
import { PrimeIcons } from 'primereact/api';
import { useRouter } from 'next/navigation';

import { AtendimentosResponse, IUsuariosResponse } from '@/Interfaces';
import { useService } from '@/contexts/ServicesContext';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import { IActionTable } from '@/components/AcoesDataTable';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta, ConfirmaAcao, sleep } from '@/service/Util';
import DtAtendimento from './DtAtendimentos';

type DadosAtendimentoProps = {
  data: AtendimentosResponse[];
  users: IUsuariosResponse[]
};

export default function DadosAtendimentoSection({ data, users }: DadosAtendimentoProps) {
  const [atendimentos, setAtendimentos] = useState(data || []);
  const [user_id, setUserId] = useState(users[0].id);
  const [rendered, setRendered] = useState(false);
  const { setLoading } = useService();
  const { FetchReq } = useApi();
  const router = useRouter();

  const ButtonsHeader: IButtonsOthers[] = [
    {
      label: 'Adicionar atendimento',
      // @ts-ignore
      icon: PrimeIcons.FILE_EDIT,
      action: () => router.push('/atendimentos/form/'),
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
      command: (data) => ConfirmaAcao('Confirma remover este atendimento?', RemoverAtendimento, data),
    },
  ];

  const ReloadAtendimentos = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await FetchReq<AtendimentosResponse[]>('BuscarAtendimentoUserId', [user_id]);
      setAtendimentos(data);
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
      window.location.reload();
    } catch (err) {
      setLoading(false);
      CatchAlerta(err, 'Erro ao remover atendimento.');
    }
  };

  useEffect(() => {
    setRendered(true);
  },[])
  return (
    rendered && (
      <>
        <TitleCards
          title="Lista de atendimentos"
          buttons={ButtonsHeader}
        />

        <div className="p-card-content">
          <DtAtendimento
            actions={acoesTable}
            value={atendimentos}
          />
        </div>
      </>
    )
  );
}
