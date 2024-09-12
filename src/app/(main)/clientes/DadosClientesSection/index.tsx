'use client'
import React, { useEffect, useState } from 'react';

import { useService } from '@/contexts/ServicesContext';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import { IActionTable, IClientes } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient'
import DtClientes from '../DtClientes';
import { CatchAlerta } from '@/service/Util';

export default function DadosClientesSection() {
  const [clients, setClients] = useState([])
  const [rendered, setRendered] = useState(false);
  const { setLoading } = useService();
  const { FetchReq } = useApi();

  const ButtonsHeader: IButtonsOthers[] = [
    {
      label: 'Adicionar cliente',
      icon: 'pi pi-user-plus',
      action: () => { },
    },
  ];

  const acoesTable: IActionTable<IClientes>[] = [
    {
      label: 'Editar cliente',
      tooltip: 'Editar cliente',
      icon: 'pi pi-fw pi-user-edit',
      command: (data) => { },
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
      console.log(err)
      CatchAlerta(err, "Erro ao consultar clientes");
    } finally {
      setLoading(false);
      setRendered(true);
    }
  }

  useEffect(() => {
    GetClients();
  }, [])
  return rendered && (
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
  );
}
