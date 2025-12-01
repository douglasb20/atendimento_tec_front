import React from 'react';
import { Metadata } from 'next';
import { SelectItem } from 'primereact/selectitem';
import { jwtDecode } from 'jwt-decode';

import CardFormSection from './CardFormSection';
import ApiService from '@/service/Api/ApiServer';
import {
  AtendimentosResponse,
  IAtendimentoStatus,
  IClientResponse,
  IServiceResponse,
  IUsuariosResponse,
  JWTToken,
} from '@/Interfaces';

export const metadata: Metadata = {
  title: 'Cadastro de atendimento',
};

export default async function FormAtendimentoPage({
  params,
}: {
  params: Promise<{ id: string[] }>;
}) {
  const { id } = await params;
  const { FetchReq, token } = await ApiService();
  const tokenDecoded = jwtDecode<JWTToken>(token);

  let dataForm = null;
  let data = null;
  if (id?.length > 0) {
    data = await FetchReq<AtendimentosResponse>('BuscarAtendimento', [id[0]]);
  }
  const [dataClients, dataAtendimentoStatus, dataServices, dataUsers] = await Promise.all([
    FetchReq<IClientResponse[]>('ListarClientes'),
    FetchReq<IAtendimentoStatus[]>('ListarAtendimentoStatus'),
    FetchReq<IServiceResponse[]>('ListarServicos'),
    FetchReq<IUsuariosResponse[]>('ListarUsuarios'),
  ]);

  const clientOptions: SelectItem[] = dataClients.map((e) => ({ label: e.nome, value: e.id }));
  const atStatusOptions: SelectItem[] = dataAtendimentoStatus.map((e) => ({
    label: e.descricao,
    value: e.id,
  }));
  const usersOptions: SelectItem[] = dataUsers.map((e) => ({ label: e.name, value: e.id }));
  const tipoEntrada: SelectItem[] = [
    {
      value: 'T',
      label: 'Tempo',
    },
    {
      value: 'S',
      label: 'Serviço',
    },
  ];

  dataForm = {
    ...data,
  };
  return (
    <div className="grid">
      <div className="card col-10 col-offset-1 shadow-1 flex flex-column justify-content-center">
        <CardFormSection
          data={data}
          clientOptions={clientOptions}
          tipoEntrada={tipoEntrada}
          atendimentoStatus={atStatusOptions}
          services={dataServices}
          usersOptions={usersOptions}
          user={{
            id: tokenDecoded.id,
            name: tokenDecoded.name,
          }}
        />
      </div>
    </div>
  );
}
