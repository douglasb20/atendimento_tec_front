'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useService } from '@/contexts/ServicesContext';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import { ClientResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import DtClientes from './DtClientes';
import { CatchAlerta, ConfirmaAcao, sleep } from '@/service/Util';
import { IActionTable } from '@/components/AcoesDataTable';

type DadosClientesProps = {
  data: ClientResponse[];
};

export default function DadosClientesSection({ data }: DadosClientesProps) {
  const [clients, setClients] = useState(data || []);

  /**
   * Acrescenta `tags_busca` — os nomes das etiquetas num texto só.
   *
   * O filtro global da tabela compara valores simples; um array de objetos
   * nunca casaria com o termo digitado. Derivado aqui para valer tanto no
   * carregamento inicial quanto depois de um refetch.
   */
  const clientsComBusca = useMemo(
    () =>
      (clients ?? []).map((cliente) => ({
        ...cliente,
        tags_busca: (cliente.tags ?? []).map((t) => t.name).join(' '),
      })),
    [clients],
  );
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

  const acoesTable: IActionTable<ClientResponse>[] = [
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
      command: (data) => ConfirmaAcao('Confirma remover este cliente?', RemoverCliente, data),
    },
  ];

  const GetClients = async () => {
    try {
      setLoading(true);
      const data = await FetchReq<ClientResponse[]>('ListarClientes');
      setClients(data);
    } catch (err) {
      CatchAlerta(err, 'Erro ao consultar clientes');
    } finally {
      setLoading(false);
    }
  };

  const RemoverCliente = async (data: ClientResponse) => {
    try {
      setLoading();
      await FetchReq('RemoverCliente', [data.id]);
      await sleep(1);
      await GetClients();
    } catch (err) {
      CatchAlerta(err, 'Erro ao remover cliente.');
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
          title="Clientes"
          buttons={ButtonsHeader}
        />

        <div className="p-card-content">
          <DtClientes
            actions={acoesTable}
            value={clientsComBusca}
          />
        </div>
      </>
    )
  );
}
