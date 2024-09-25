'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useService } from '@/contexts/ServicesContext';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import { AtendimentosResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import DtAtendimento from './DtAtendimentos';
import { CatchAlerta, ConfirmaAcao, sleep } from '@/service/Util';
import { IActionTable } from '@/components/AcoesDataTable';
import { PrimeIcons } from 'primereact/api';

export default function DadosClientesSection() {
  const [atendimentos, setAtendimentos] = useState([]);
  const [rendered, setRendered] = useState(false);
  const { setLoading } = useService();
  const { FetchReq } = useApi();
  const router = useRouter();

  const ButtonsHeader: IButtonsOthers[] = [
    {
      label: 'Adicionar atendimento',
      // @ts-ignore
      icon: PrimeIcons.FILE_EDIT,
      action: () => router.push('/clientes/form/'),
    },
  ];

  const acoesTable: IActionTable<AtendimentosResponse>[] = [
    {
      label: 'Editar cliente',
      tooltip: 'Editar cliente',
      icon: 'pi pi-fw pi-user-edit',
      command: (data) => router.push('/clientes/form/' + data.id),
    },
    {
      label: 'Excluir cliente',
      tooltip: 'Excluir cliente',
      icon: 'pi pi-fw pi-times',
      bgcolor: 'danger',
      command: (data) => ConfirmaAcao("Confirma remover este cliente?", RemoverCliente, data),
    },
  ];

  const GetAtendimentos = async () => {
    try {
      setLoading(true);
      const data = await FetchReq<AtendimentosResponse[]>('ListarAtendimentos');
      setAtendimentos(data);
    } catch (err) {
      console.log(err);
      CatchAlerta(err, 'Erro ao consultar atendimentos');
    } finally {
      setLoading(false);
      setRendered(true);
    }
  };

  const RemoverCliente = async (data: AtendimentosResponse) => {
    try {
      setLoading(true);
      await FetchReq('RemoverCliente', [data.id]);
      await sleep(1);
      window.location.reload();
    } catch (err) {
      CatchAlerta(err, "Erro ao remover cliente.")
    }
  }

  useEffect(() => {
    GetAtendimentos();
  }, []);
  return (
    rendered && (
      <>
        <TitleCards
          title="Atendimentos dos técnicos"
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
