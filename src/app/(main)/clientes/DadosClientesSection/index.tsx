'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useService } from '@/contexts/ServicesContext';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import { IClientes } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import DtClientes from './DtClientes';
import { CatchAlerta } from '@/service/Util';
import { IActionTable } from '@/components/AcoesDataTable';

export default function DadosClientesSection() {
  const [clients, setClients] = useState([]);
  const [rendered, setRendered] = useState(false);
  const { setLoading } = useService();
  const { FetchReq } = useApi();
  const router = useRouter();

  const ButtonsHeader: IButtonsOthers[] = [
    {
      label: 'Adicionar cliente',
      icon: 'pi pi-user-plus',
      action: () => router.push('/clientes/form/'),
    },
  ];

  const acoesTable: IActionTable<IClientes>[] = [
    {
      label: 'Editar cliente',
      tooltip: 'Editar cliente',
      icon: 'pi pi-fw pi-user-edit',
      command: (data) => {},
    },
    {
      label: 'Excluir cliente',
      tooltip: 'Excluir cliente',
      icon: 'pi pi-fw pi-times',
      bgcolor: 'danger',
      command: (data) => {},
    },
  ];

  const GetClients = async () => {
    try {
      setLoading(true);
      const data = await FetchReq<IClientes[]>('ListarClientes');
      setClients(data);
    } catch (err) {
      console.log(err);
      CatchAlerta(err, 'Erro ao consultar clientes');
    } finally {
      setLoading(false);
      setRendered(true);
    }
  };

  useEffect(() => {
    GetClients();
  }, []);
  return (
    rendered && (
      <>
        <TitleCards
          title="Clientes"
          buttons={ButtonsHeader}
        />

        <div className="p-card-content">
          <DtClientes
            actions={acoesTable}
            value={clients}
          />
        </div>
      </>
    )
  );
}
