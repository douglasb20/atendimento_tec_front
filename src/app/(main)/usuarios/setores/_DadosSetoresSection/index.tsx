'use client';

import { PrimeIcons } from 'primereact/api';
import { useEffect, useState } from 'react';

import { IActionTable } from '@/components/AcoesDataTable';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import { useService } from '@/contexts/ServicesContext';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';
import { DepartmentResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { AlertaCallback, CatchAlerta, ConfirmaAcao, sleep } from '@/service/Util';

import DtSetores from './DtSetores';
import ModalFormSetor, { FormSetor } from './ModalFormSetor';

type DadosSetoresProps = {
  data: DepartmentResponse[];
};

export default function DadosSetoresSection({ data }: DadosSetoresProps) {
  const [setores, setSetores] = useState(data || []);
  const [setorAtivo, setSetorAtivo] = useState<DepartmentResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const { setLoading } = useService();
  const { FetchReq } = useApi();
  const { podeAdicionar, podeEditar, podeExcluir, semPermissao } =
    usePermissoesModulo('department');

  // Desabilitado, não ausente: cinza diz "existe e você não pode".
  const ButtonsHeader: IButtonsOthers[] = [
    {
      label: 'Novo setor',
      icon: PrimeIcons.PLUS,
      action: () => AbrirModal(null),
      disabled: !podeAdicionar,
      tooltip: podeAdicionar ? undefined : semPermissao,
    },
  ];

  const acoesTable: IActionTable<DepartmentResponse>[] = [
    {
      label: podeEditar ? 'Editar' : 'Visualizar',
      tooltip: podeEditar ? 'Editar setor' : 'Ver setor',
      icon: podeEditar ? PrimeIcons.PENCIL : PrimeIcons.EYE,
      command: (setor) => AbrirModal(setor),
    },
    {
      isHidden: () => !podeExcluir,
      label: 'Remover',
      tooltip: 'Remover setor',
      icon: PrimeIcons.TRASH,
      bgcolor: 'danger',
      command: (setor) =>
        ConfirmaAcao(
          // Remover tira os membros do setor - a confirmação diz quantos, para
          // ninguém descobrir depois que sumiu de onde atendia.
          setor.total_usuarios
            ? `O setor "${setor.name}" será removido, e ${setor.total_usuarios} ${
                setor.total_usuarios === 1 ? 'usuário sairá dele' : 'usuários sairão dele'
              }.`
            : `O setor "${setor.name}" será removido.`,
          RemoverSetor,
          setor,
          'Remover setor?',
          'Remover',
          'Cancelar',
        ),
    },
  ];

  const AbrirModal = (setor: DepartmentResponse | null) => {
    setSetorAtivo(setor);
    setModalVisible(true);
  };

  const FecharModal = async () => {
    setModalVisible(false);
    await sleep(1 / 2);
    setSetorAtivo(null);
  };

  const ListarSetores = async (use_loading = true) => {
    try {
      if (use_loading) setLoading(true);
      setSetores(await FetchReq<DepartmentResponse[]>('ListarSetores'));
    } catch (err) {
      CatchAlerta(err, 'Erro ao consultar setores');
    } finally {
      if (use_loading) setLoading(false);
    }
  };

  const SalvarSetor = async (fields: FormSetor) => {
    try {
      setLoading(true);

      const body = { name: fields.name, description: fields.description || null };

      if (setorAtivo?.id) {
        await FetchReq({ endpoint: 'AtualizarSetor', variables: [setorAtivo.id], body });
      } else {
        await FetchReq({ endpoint: 'AdicionarSetor', body });
      }

      await FecharModal();
      await ListarSetores(false);

      AlertaCallback('Setor salvo com sucesso!', () => {}, 'success');
    } catch (err) {
      // Nome repetido volta 409 com mensagem própria; o `CatchAlerta` a exibe.
      CatchAlerta(err, 'Erro ao salvar setor');
    } finally {
      setLoading(false);
    }
  };

  const RemoverSetor = async (setor: DepartmentResponse) => {
    try {
      setLoading(true);
      await FetchReq({ endpoint: 'RemoverSetor', variables: [setor.id] });
      await ListarSetores(false);
    } catch (err) {
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
          title="Setores"
          buttons={ButtonsHeader}
        />

        <div className="p-card-content">
          <DtSetores
            actions={acoesTable}
            value={setores}
          />
        </div>

        <ModalFormSetor
          visible={modalVisible}
          onHide={FecharModal}
          data={setorAtivo}
          onConfirm={SalvarSetor}
        />
      </>
    )
  );
}
