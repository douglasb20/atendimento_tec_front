'use client';
import { useEffect, useState } from 'react';

import { useService } from '@/contexts/ServicesContext';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import { IActionTable } from '@/components/AcoesDataTable';
import { AlertaCallback, CatchAlerta, ConfirmaAcao, sleep } from '@/service/Util';
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
          label: 'Adicionar atendente',
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
      label: podeEditar ? 'Editar atendente' : 'Visualizar atendente',
      tooltip: podeEditar ? 'Editar atendente' : 'Ver atendente',
      icon: podeEditar ? 'pi pi-fw pi-user-edit' : 'pi pi-fw pi-eye',
      command: (data) => {
        GetUserById(data.id);
      },
    },
    {
      // Só enquanto o convite não foi aceito - depois disso o atendente já
      // tem senha própria, e não há mais o que reenviar.
      isHidden: (data) => !podeEditar || data.convite_status !== 'pendente',
      label: 'Reenviar convite',
      tooltip: 'Reenviar convite por e-mail',
      icon: 'pi pi-fw pi-send',
      bgcolor: 'info',
      command: (data) => ReenviarConvite(data),
    },
    {
      isHidden: (data) => !podeEditar || data.convite_status !== 'pendente',
      label: 'Copiar link do convite',
      tooltip: 'Copiar link do convite',
      icon: 'pi pi-fw pi-copy',
      bgcolor: 'secondary',
      command: (data) => CopiarLinkConvite(data),
    },
    {
      isHidden: () => !podeExcluir,
      label: 'Excluir atendente',
      tooltip: 'Excluir atendente',
      icon: 'pi pi-fw pi-times',
      bgcolor: 'danger',
      command: (data) => ConfirmaAcao('Confirma remover este atendente?', RemoverUsuario, data),
    },
  ];

  const GetUsers = async () => {
    try {
      setLoading(true);
      const data = await FetchReq<IUsuariosResponse[]>('ListarUsuarios');
      setUsuarios(data);
    } catch (err) {
      CatchAlerta(err, 'Erro ao consultar atendentes');
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
      CatchAlerta(err, 'Erro ao consultar atendentes');
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
      CatchAlerta(err, 'Erro ao remover atendente.');
    }
  };

  const ReenviarConvite = async (data: IUsuariosResponse) => {
    try {
      setLoading(true);
      await FetchReq({ endpoint: 'ReenviarConvite', variables: [data.id] });
      AlertaCallback('Convite reenviado!', () => {}, 'success');
    } catch (err) {
      CatchAlerta(err, 'Erro ao reenviar convite');
    } finally {
      setLoading(false);
    }
  };

  // Não-destrutiva e instantânea: sem `ConfirmaAcao`, diferente das outras.
  const CopiarLinkConvite = async (data: IUsuariosResponse) => {
    try {
      setLoading(true);
      const { url } = await FetchReq<{ url: string }>({
        endpoint: 'LinkConvite',
        variables: [data.id],
      });
      await navigator.clipboard.writeText(url);
      AlertaCallback('Link copiado!', () => {}, 'success');
    } catch (err) {
      CatchAlerta(err, 'Erro ao copiar link do convite');
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
          title="Atendentes"
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
