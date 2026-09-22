'use client';

import { PrimeIcons } from 'primereact/api';
import { useEffect, useState } from 'react';

import { IActionTable } from '@/components/AcoesDataTable';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import { useService } from '@/contexts/ServicesContext';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';
import { TagResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { AlertaCallback, CatchAlerta, ConfirmaAcao, sleep } from '@/service/Util';

import DtTags from './DtTags';
import ModalFormTag from './ModalFormTag';

type DadosTagsProps = {
  data: TagResponse[];
};

type FormTag = { id?: number; name: string; color: string; text_color: 'light' | 'dark' };

export default function DadosTagsSection({ data }: DadosTagsProps) {
  const [tags, setTags] = useState(data || []);
  const [tagAtiva, setTagAtiva] = useState<TagResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const { setLoading } = useService();
  const { FetchReq } = useApi();
  const { podeAdicionar, podeEditar, podeExcluir, semPermissao } =
    usePermissoesModulo('tag');

  // Desabilitado, não ausente: cinza diz "existe e você não pode".
  const ButtonsHeader: IButtonsOthers[] = [
    {
      label: 'Nova etiqueta',
      icon: PrimeIcons.PLUS,
      action: () => AbrirModal(null),
      disabled: !podeAdicionar,
      tooltip: podeAdicionar ? undefined : semPermissao,
    },
  ];

  const acoesTable: IActionTable<TagResponse>[] = [
    {
      // Sempre visível: sem `:update` o cadastro abre em somente leitura, que
      // é o que `:view` dá direito de fazer.
      label: podeEditar ? 'Editar' : 'Visualizar',
      tooltip: podeEditar ? 'Editar etiqueta' : 'Ver etiqueta',
      icon: podeEditar ? PrimeIcons.PENCIL : PrimeIcons.EYE,
      command: (tag) => AbrirModal(tag),
    },
    {
      isHidden: () => !podeExcluir,
      label: 'Remover',
      tooltip: 'Remover etiqueta',
      icon: PrimeIcons.TRASH,
      bgcolor: 'danger',
      command: (tag) =>
        ConfirmaAcao(
          `A etiqueta "${tag.name}" será removida.`,
          RemoverTag,
          tag,
          'Remover etiqueta?',
          'Remover',
          'Cancelar',
        ),
    },
  ];

  const AbrirModal = (tag: TagResponse | null) => {
    setTagAtiva(tag);
    setModalVisible(true);
  };

  const FecharModal = async () => {
    setModalVisible(false);
    await sleep(1 / 2);
    setTagAtiva(null);
  };

  const ListarTags = async (use_loading = true) => {
    try {
      if (use_loading) setLoading(true);
      const dados = await FetchReq<TagResponse[]>('ListarTags');
      setTags(dados);
    } catch (err) {
      CatchAlerta(err, 'Erro ao consultar etiquetas');
    } finally {
      if (use_loading) setLoading(false);
      setRendered(true);
    }
  };

  const SalvarTag = async (fields: FormTag) => {
    try {
      setLoading(true);

      const body = {
        name: fields.name,
        color: fields.color,
        text_color: fields.text_color,
      };

      if (tagAtiva?.id) {
        await FetchReq({ endpoint: 'AtualizarTag', variables: [tagAtiva.id], body });
      } else {
        await FetchReq({ endpoint: 'AdicionarTag', body });
      }

      await FecharModal();
      await ListarTags(false);

      AlertaCallback('Etiqueta salva com sucesso!', () => {}, 'success');
    } catch (err) {
      // O backend recusa nome repetido com 409 e mensagem própria; o
      // `CatchAlerta` a exibe em vez do texto genérico.
      CatchAlerta(err, 'Erro ao salvar etiqueta');
    } finally {
      setLoading(false);
    }
  };

  const RemoverTag = async (tag: TagResponse) => {
    try {
      setLoading(true);
      await FetchReq({ endpoint: 'RemoverTag', variables: [tag.id] });
      await sleep(1);
      await ListarTags(false);
    } catch (err) {
      // Etiqueta em uso volta 400 dizendo quantos clientes a usam.
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
          title="Etiquetas"
          buttons={ButtonsHeader}
        />

        <div className="p-card-content">
          <DtTags
            actions={acoesTable}
            value={tags}
          />
        </div>

        <ModalFormTag
          visible={modalVisible}
          onHide={FecharModal}
          data={tagAtiva}
          onConfirm={SalvarTag}
        />
      </>
    )
  );
}
