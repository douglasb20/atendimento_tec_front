'use client';
import { useEffect, useState } from 'react';

import { useService } from '@/contexts/ServicesContext';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import { IActionTable } from '@/components/AcoesDataTable';
import { CatchAlerta, ConfirmaAcao, sleep } from '@/service/Util';
import ApiClient from '@/service/Api/ApiClient';
import { IUsuariosResponse } from '@/Interfaces';

import DtUsuarios from './DtUsuarios';
import ModalFormUser from './ModalFormUser';

type DadosUsuariosProps = {
  data: IUsuariosResponse[];
};

export default function DadosClientesSection({ data }: DadosUsuariosProps) {
  const [usuarios, setUsuarios] = useState<IUsuariosResponse[]>(data || []);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<IUsuariosResponse>(null);
  const [rendered, setRendered] = useState(false);
  const [modalForm, setModalForm] = useState(false);
  const { setLoading } = useService();
  const { podeAdicionar, podeEditar, podeExcluir, semPermissao } =
    usePermissoesModulo('user');
  const { FetchReq } = ApiClient();

  // Sem permissão de criar, o botão não aparece: a chamada seria recusada
  // pelo backend de qualquer forma.
  const ButtonsHeader: IButtonsOthers[] = [
        {
          label: 'Adicionar usuário',
          icon: 'pi pi-user-plus',
          action: () => {
            setUsuarioSelecionado(null);
            setModalForm(true);
          },
          disabled: !podeAdicionar,
          tooltip: podeAdicionar ? undefined : semPermissao,
        },
  ];

  const acoesTable: IActionTable<IUsuariosResponse>[] = [
    {
      // Sempre visível: sem `:update` o cadastro abre em somente leitura.
      label: podeEditar ? 'Editar usuário' : 'Visualizar usuário',
      tooltip: podeEditar ? 'Editar usuário' : 'Ver usuário',
      icon: podeEditar ? 'pi pi-fw pi-user-edit' : 'pi pi-fw pi-eye',
      command: (data) => {
        GetUserById(data.id);
      },
    },
    {
      isHidden: () => !podeExcluir,
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
    }
  };

  const GetUserById = async (id: number) => {
    try {
      setLoading(true);
      const data = await FetchReq<IUsuariosResponse>('BuscarUsuarioPorId', [id]);
      ShowModalFormUser(data);
    } catch (err) {
      CatchAlerta(err, 'Erro ao consultar usuários');
    } finally {
      setLoading(false);
    }
  };

  const ShowModalFormUser = (data?: IUsuariosResponse) => {
    setUsuarioSelecionado(data || null);
    setModalForm(true);
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
    setRendered(true);
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
