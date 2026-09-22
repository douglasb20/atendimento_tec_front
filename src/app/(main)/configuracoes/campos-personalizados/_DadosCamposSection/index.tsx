'use client';

import { useEffect, useState } from 'react';

import { IActionTable } from '@/components/AcoesDataTable';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import { useService } from '@/contexts/ServicesContext';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';
import { CustomFieldResponse, listaParaAplicaA } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { AlertaCallback, CatchAlerta, ConfirmaAcao, sleep } from '@/service/Util';

import DtCampos from './DtCampos';
import ModalFormCampo, { FormCampo } from './ModalFormCampo';

type DadosCamposProps = {
  data: CustomFieldResponse[];
};

export default function DadosCamposSection({ data }: DadosCamposProps) {
  const [campos, setCampos] = useState<CustomFieldResponse[]>(data || []);
  const [campoAtivo, setCampoAtivo] = useState<CustomFieldResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const { setLoading } = useService();
  const { podeAdicionar, podeEditar, podeExcluir, semPermissao } =
    usePermissoesModulo('custom.field');
  const { FetchReq } = useApi();

  const ButtonsHeader: IButtonsOthers[] = [
        {
          label: 'Adicionar campo',
          icon: 'pi pi-plus',
          action: () => AbrirModal(null),
          disabled: !podeAdicionar,
          tooltip: podeAdicionar ? undefined : semPermissao,
        },
  ];

  const acoesTable: IActionTable<CustomFieldResponse>[] = [
    {
      // Sempre visível: sem `:update` o cadastro abre em somente leitura.
      label: podeEditar ? 'Editar campo' : 'Visualizar campo',
      tooltip: podeEditar ? 'Editar campo' : 'Ver campo',
      icon: podeEditar ? 'pi pi-fw pi-pencil' : 'pi pi-fw pi-eye',
      command: (campo) => AbrirModal(campo),
    },
    {
      isHidden: () => !podeExcluir,
      label: 'Remover campo',
      tooltip: 'Remover campo',
      icon: 'pi pi-fw pi-trash',
      bgcolor: 'danger',
      command: (campo) =>
        ConfirmaAcao(
          `O campo "${campo.nome}" será removido.`,
          RemoverCampo,
          campo,
          'Remover campo?',
          'Remover',
          'Cancelar',
        ),
    },
  ];

  const AbrirModal = (campo: CustomFieldResponse | null) => {
    setCampoAtivo(campo);
    setModalVisible(true);
  };

  const FecharModal = async () => {
    setModalVisible(false);
    await sleep(1 / 2);
    setCampoAtivo(null);
  };

  const ListarCampos = async (use_loading = true) => {
    try {
      if (use_loading) setLoading(true);
      const dados = await FetchReq<CustomFieldResponse[]>('ListarCamposPersonalizados');
      setCampos(dados);
    } catch (err) {
      CatchAlerta(err, 'Erro ao consultar campos personalizados');
    } finally {
      if (use_loading) setLoading(false);
      setRendered(true);
    }
  };

  const SalvarCampo = async (fields: FormCampo) => {
    try {
      setLoading(true);

      const body = {
        nome: fields.nome,
        tipo: fields.tipo,
        // A tela marca os destinos em caixas; a API guarda um texto só.
        aplica_a: listaParaAplicaA(fields.aplica_em),
        // As opções só existem no tipo lista; mandá-las nos demais faria o
        // backend recusar.
        ...(fields.tipo === 'lista' && { opcoes: fields.opcoes }),
      };

      if (campoAtivo?.id) {
        await FetchReq({
          endpoint: 'AtualizarCampoPersonalizado',
          variables: [campoAtivo.id],
          body,
        });
      } else {
        await FetchReq({ endpoint: 'AdicionarCampoPersonalizado', body });
      }

      await FecharModal();
      await ListarCampos(false);

      AlertaCallback('Campo salvo com sucesso!', () => {}, 'success');
    } catch (err) {
      // Nome repetido volta 409, e trocar o tipo de um campo em uso volta 400
      // com a contagem - as duas mensagens vêm do backend e são exibidas como
      // estão.
      CatchAlerta(err, 'Erro ao salvar campo');
    } finally {
      setLoading(false);
    }
  };

  const RemoverCampo = async (campo: CustomFieldResponse) => {
    try {
      setLoading(true);
      await FetchReq({ endpoint: 'RemoverCampoPersonalizado', variables: [campo.id] });
      await sleep(1);
      await ListarCampos(false);
    } catch (err) {
      // Campo em uso volta 400 dizendo quantos registros o usam.
      CatchAlerta(err, 'Erro ao remover campo');
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
          title="Campos personalizados"
          buttons={ButtonsHeader}
        />

        {/* O catálogo não põe campo em ninguém: é a lista do que pode ser
            escolhido ao cadastrar. Sem esta frase, quem cadastra um campo
            espera vê-lo aparecer em todos os contatos. */}
        <p className="mt-0 mb-3 text-600 text-sm">
          Cadastre aqui os campos que poderão ser preenchidos em contatos e clientes. Cada cadastro
          escolhe quais campos usar.
        </p>

        <div className="p-card-content">
          <DtCampos
            actions={acoesTable}
            value={campos}
          />
        </div>

        <ModalFormCampo
          visible={modalVisible}
          onHide={FecharModal}
          onConfirm={SalvarCampo}
          data={campoAtivo}
        />
      </>
    )
  );
}
