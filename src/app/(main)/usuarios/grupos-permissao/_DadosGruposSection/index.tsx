'use client';

import { PrimeIcons } from 'primereact/api';
import { useEffect, useState } from 'react';

import { IActionTable } from '@/components/AcoesDataTable';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import { useService } from '@/contexts/ServicesContext';
import { usePermissoes } from '@/hooks/usePermissoes';
import {
  PermissionGroupResponse,
  PermissionModuleResponse,
  PermissionResponse,
} from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { AlertaCallback, CatchAlerta, ConfirmaAcao, sleep } from '@/service/Util';

import DtGrupos from './DtGrupos';
import ModalFormGrupo, { FormGrupo } from './ModalFormGrupo';

type Props = {
  data: PermissionGroupResponse[];
  permissoes: PermissionResponse[];
  modulos: PermissionModuleResponse[];
};

export default function DadosGruposSection({ data, permissoes, modulos }: Props) {
  const [grupos, setGrupos] = useState(data || []);
  const [grupoAtivo, setGrupoAtivo] = useState<PermissionGroupResponse | null>(null);
  /**
   * Distingue "editar este grupo" de "criar um a partir dele".
   *
   * O modal recebe o mesmo objeto nos dois casos — a diferença é só o que
   * acontece ao salvar: editar manda PATCH, clonar manda POST.
   */
  const [clonando, setClonando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const { setLoading } = useService();
  const { FetchReq } = useApi();
  const { pode } = usePermissoes();

  const ButtonsHeader: IButtonsOthers[] = pode('permission_group:add')
    ? [{ label: 'Novo grupo', icon: PrimeIcons.PLUS, action: () => AbrirModal(null) }]
    : [];

  const acoesTable: IActionTable<PermissionGroupResponse>[] = [
    {
      label: 'Editar',
      tooltip: 'Editar grupo de permissão',
      icon: PrimeIcons.PENCIL,
      isHidden: () => !pode('permission_group:update'),
      command: (grupo) => AbrirModal(grupo),
    },
    {
      // Duplicar resolve o caso comum: partir de um grupo pronto e mexer em
      // uma ou duas permissões. Montar 18 caixas de seleção do zero para
      // chegar a algo parecido com o Atendente seria trabalho repetido.
      label: 'Duplicar',
      tooltip: 'Criar um grupo novo a partir deste',
      icon: PrimeIcons.COPY,
      isHidden: () => !pode('permission_group:add'),
      command: (grupo) => AbrirModal(grupo, true),
    },
    {
      label: 'Remover',
      tooltip: 'Remover grupo de permissão',
      icon: PrimeIcons.TRASH,
      bgcolor: 'danger',
      // Grupo do sistema não é removível, e a etiqueta na listagem já diz por
      // quê — oferecer o botão só para ele falhar seria pior.
      isHidden: (grupo) => !pode('permission_group:delete') || grupo.is_system,
      command: (grupo) =>
        ConfirmaAcao(
          `O grupo "${grupo.name}" será removido.`,
          RemoverGrupo,
          grupo,
          'Remover grupo?',
          'Remover',
          'Cancelar',
        ),
    },
  ];

  const AbrirModal = (grupo: PermissionGroupResponse | null, duplicar = false) => {
    setClonando(duplicar);
    setGrupoAtivo(grupo);
    setModalVisible(true);
  };

  const FecharModal = async () => {
    setModalVisible(false);
    await sleep(1 / 2);
    setGrupoAtivo(null);
    setClonando(false);
  };

  const ListarGrupos = async (use_loading = true) => {
    try {
      if (use_loading) setLoading(true);
      const dados = await FetchReq<PermissionGroupResponse[]>('ListarGruposPermissao');
      setGrupos(dados);
    } catch (err) {
      CatchAlerta(err, 'Erro ao consultar grupos');
    } finally {
      if (use_loading) setLoading(false);
      setRendered(true);
    }
  };

  const SalvarGrupo = async (fields: FormGrupo) => {
    try {
      setLoading(true);

      const body = {
        name: fields.name,
        description: fields.description || null,
        permission_ids: fields.permission_ids,
      };

      // Clonando, o id do grupo de origem serve só para preencher o
      // formulário: o que sai daqui é um grupo novo.
      if (grupoAtivo?.id && !clonando) {
        await FetchReq({
          endpoint: 'AtualizarGrupoPermissao',
          variables: [grupoAtivo.id],
          body,
        });
      } else {
        await FetchReq({ endpoint: 'AdicionarGrupoPermissao', body });
      }

      await FecharModal();
      await ListarGrupos(false);

      // Alterar um grupo muda o que os usuários dele podem fazer, e a interface
      // deles só reflete isso no próximo carregamento do cookie `userInfo`.
      AlertaCallback(
        clonando
          ? 'Grupo criado com sucesso!'
          : 'Grupo salvo! Quem usa este grupo verá a mudança ao entrar de novo.',
        () => {},
        'success',
      );
    } catch (err) {
      // Nome repetido volta 409 com mensagem própria do backend.
      CatchAlerta(err, 'Erro ao salvar grupo');
    } finally {
      setLoading(false);
    }
  };

  const RemoverGrupo = async (grupo: PermissionGroupResponse) => {
    try {
      setLoading(true);
      await FetchReq({ endpoint: 'RemoverGrupoPermissao', variables: [grupo.id] });
      await sleep(1);
      await ListarGrupos(false);
    } catch (err) {
      // Grupo em uso volta 400 dizendo quantos usuários o usam.
      CatchAlerta(err, 'Não foi possível remover');
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
          title="Grupos de permissão"
          buttons={ButtonsHeader}
        />

        <div className="p-card-content">
          <DtGrupos
            actions={acoesTable}
            value={grupos}
          />
        </div>

        <ModalFormGrupo
          visible={modalVisible}
          onHide={FecharModal}
          data={grupoAtivo}
          clonando={clonando}
          permissoes={permissoes}
          modulos={modulos}
          onConfirm={SalvarGrupo}
        />
      </>
    )
  );
}
