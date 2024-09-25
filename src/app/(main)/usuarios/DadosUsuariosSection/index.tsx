'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useService } from '@/contexts/ServicesContext';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import { IUsuariosResponse } from '@/Interfaces';
import { CatchAlerta, ConfirmaAcao, sleep } from '@/service/Util';
import { IActionTable } from '@/components/AcoesDataTable';
import useApi from '@/service/Api/ApiClient';
import DtUsuarios from './DtUsuarios';
import ModalFormUser from './ModalFormUser';

export default function DadosClientesSection() {
  const [usuarios, setUsuarios] = useState<IUsuariosResponse[]>([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<IUsuariosResponse>(null);
  const [rendered, setRendered] = useState(false);
  const [modalForm, setModalForm] = useState(false);
  const { setLoading } = useService();
  const { FetchReq } = useApi();
  const router = useRouter();

  const ButtonsHeader: IButtonsOthers[] = [
    {
      label: 'Adicionar usuário',
      icon: 'pi pi-user-plus',
      action: () => {
        setUsuarioSelecionado(null);
        setModalForm(true);
      },
    },
  ];

  const acoesTable: IActionTable<IUsuariosResponse>[] = [
    {
      label: 'Editar usuário',
      tooltip: 'Editar usuário',
      icon: 'pi pi-fw pi-user-edit',
      command: (data) => {
        setUsuarioSelecionado(data);
        setModalForm(true);
      },
    },
    {
      label: 'Excluir usuário',
      tooltip: 'Excluir usuário',
      icon: 'pi pi-fw pi-times',
      bgcolor: 'danger',
      command: (data) => ConfirmaAcao('Confirma remover este usuario?', RemoverUsuario, data),
    },
  ];

  const GetUsers = async () => {
    try {
      setLoading(true);
      const data = await FetchReq<IUsuariosResponse[]>('ListarUsuarios');
      setUsuarios(data);
    } catch (err) {
      CatchAlerta(err, 'Erro ao consultar usuários');
    } finally {
      setLoading(false);
      setRendered(true);
    }
  };

  const RemoverUsuario = async (data: IUsuariosResponse) => {
    try {
      setLoading(true);
      await FetchReq('RemoverUsuario', [data.id]);
      await sleep(1);
      GetUsers();
    } catch (err) {
      CatchAlerta(err, 'Erro ao remover usuário.');
    }
  };

  useEffect(() => {
    GetUsers();
  }, []);
  return (
    rendered && (
      <>
        <TitleCards
          title="Usuários"
          buttons={ButtonsHeader}
        />

        <div className="p-card-content">
          <DtUsuarios
            actions={acoesTable}
            value={usuarios}
          />
        </div>

        <ModalFormUser
          visible={modalForm}
          onHide={() => setModalForm(false)}
          data={usuarioSelecionado}
          onConfirm={GetUsers}
        />
      </>
    )
  );
}
