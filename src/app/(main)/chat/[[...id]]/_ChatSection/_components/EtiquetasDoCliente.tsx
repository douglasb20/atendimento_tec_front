'use client';

import { Button } from 'primereact/button';
import { MultiSelect } from 'primereact/multiselect';
import { useEffect, useState } from 'react';

import ChipTag from '@/components/ChipTag';
import { ClientResponse, TagResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta } from '@/service/Util';

type EtiquetasDoClienteProps = {
  cliente: ClientResponse;
  /** Recebe o cliente atualizado, para a conversa refletir a mudança na hora. */
  onAtualizado?: (cliente: ClientResponse) => void;
};

/**
 * Etiquetas do cliente no painel do chat, editáveis ali mesmo.
 *
 * Classificar o cliente costuma acontecer *durante* o atendimento - mandar o
 * atendente até o cadastro quebraria o fluxo da conversa.
 */
const EtiquetasDoCliente = ({ cliente, onAtualizado }: EtiquetasDoClienteProps) => {
  const { FetchReq } = useApi();

  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [opcoes, setOpcoes] = useState<TagResponse[]>([]);
  const [selecionadas, setSelecionadas] = useState<number[]>([]);

  const tags = cliente.tags ?? [];

  // As opções só são buscadas ao entrar em edição: o painel abre a cada clique
  // no cabeçalho, e carregar a lista toda vez seria requisição à toa.
  const abrirEdicao = async () => {
    setSelecionadas(tags.map((t) => t.id));
    setEditando(true);

    if (opcoes.length === 0) {
      try {
        setOpcoes((await FetchReq<TagResponse[]>('ListarTags')) ?? []);
      } catch (erro) {
        CatchAlerta(erro, 'Não foi possível carregar as etiquetas');
      }
    }
  };

  const salvar = async () => {
    try {
      setSalvando(true);

      const atualizado = await FetchReq<ClientResponse>({
        endpoint: 'AtualizarTagsCliente',
        variables: [cliente.id],
        body: { tag_ids: selecionadas },
      });

      onAtualizado?.(atualizado);
      setEditando(false);
    } catch (erro) {
      CatchAlerta(erro, 'Não foi possível salvar as etiquetas');
    } finally {
      setSalvando(false);
    }
  };

  // Fecha a edição quando a conversa muda: os ids marcados seriam de outro
  // cliente.
  useEffect(() => {
    setEditando(false);
  }, [cliente.id]);

  if (editando) {
    return (
      <div className="flex flex-column gap-2">
        <span className="text-xs text-500 uppercase">Etiquetas</span>

        <MultiSelect
          value={selecionadas}
          onChange={(e) => setSelecionadas(e.value)}
          options={opcoes}
          optionLabel="name"
          optionValue="id"
          display="chip"
          filter
          placeholder="Selecione as etiquetas"
          emptyMessage="Nenhuma etiqueta cadastrada"
          className="w-full"
          itemTemplate={(tag: TagResponse) => <ChipTag tag={tag} />}
          selectedItemTemplate={(id: number) => {
            const tag = opcoes.find((t) => t.id === id);
            return tag ? (
              <ChipTag
                tag={tag}
                className="mr-1"
              />
            ) : null;
          }}
        />

        <div className="flex justify-content-end gap-2">
          <Button
            label="Cancelar"
            size="small"
            text
            onClick={() => setEditando(false)}
            disabled={salvando}
          />
          <Button
            label="Salvar"
            icon="fa-regular fa-check"
            size="small"
            loading={salvando}
            onClick={salvar}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-column gap-2">
      <div className="flex align-items-center justify-content-between">
        <span className="text-xs text-500 uppercase">Etiquetas</span>
        <Button
          icon="fa-regular fa-pen-to-square"
          text
          rounded
          size="small"
          aria-label="Editar etiquetas"
          tooltip="Editar etiquetas"
          tooltipOptions={{ position: 'left' }}
          onClick={abrirEdicao}
        />
      </div>

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <ChipTag
              key={tag.id}
              tag={tag}
            />
          ))}
        </div>
      ) : (
        <span className="text-sm text-400">Nenhuma etiqueta</span>
      )}
    </div>
  );
};

export default EtiquetasDoCliente;
