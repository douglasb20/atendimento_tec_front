'use client';

import { Button } from 'primereact/button';
import { Sidebar } from 'primereact/sidebar';

import Avatar from '@/components/Avatar';
import { ContactResponse } from '@/Interfaces';
import { DateToBR, Mask } from '@/service/Util';
import { useChatStore } from '@/store/useChatStore';
import EtiquetasDoCliente from './EtiquetasDoCliente';

type SidebarDetalhesContatoProps = {
  visible: boolean;
  onHide: () => void;
  contato?: ContactResponse;
  /** Abre o cadastro para corrigir os dados ou trocar o cliente. */
  onEditar?: () => void;
};

/** Uma linha do painel; some quando não há o que mostrar. */
const Campo = ({ rotulo, valor }: { rotulo: string; valor?: string | null }) => {
  if (!valor) return null;

  return (
    <div className="flex flex-column gap-1">
      <span className="text-xs text-500 uppercase">{rotulo}</span>
      <span className="text-sm text-900 word-break-break-word">{valor}</span>
    </div>
  );
};

const Secao = ({
  titulo,
  icone,
  children,
}: {
  titulo: string;
  icone: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-column gap-3">
    <div className="flex align-items-center gap-2 pb-2 border-bottom-1 surface-border">
      <i className={`${icone} text-primary`} />
      <span className="font-semibold text-900">{titulo}</span>
    </div>
    <div className="flex flex-column gap-3 px-1">{children}</div>
  </div>
);

/**
 * Painel lateral com os dados de quem está do outro lado da conversa.
 *
 * O cliente vem primeiro: é ele que identifica o atendimento, e o contato é a
 * pessoa que escreveu em nome dele.
 */
const SidebarDetalhesContato = ({
  visible,
  onHide,
  contato,
  onEditar,
}: SidebarDetalhesContatoProps) => {
  const patchActiveChat = useChatStore((s) => s.patchActiveChat);
  const cliente = contato?.client;

  /**
   * Propaga as etiquetas novas para a conversa aberta.
   *
   * Sem isto, fechar e reabrir o painel mostraria as etiquetas antigas — o
   * `activeChat` guarda o contato com o cliente aninhado, e ele não se atualiza
   * sozinho.
   */
  const aoAtualizarCliente = (atualizado: typeof cliente) => {
    if (!contato) return;

    patchActiveChat({ contact: { ...contato, client: atualizado } });
  };

  return (
    <Sidebar
      visible={visible}
      onHide={onHide}
      position="right"
      className="w-full sm:w-25rem"
      header={<span className="font-semibold text-lg">Dados do atendimento</span>}
    >
      <div className="flex flex-column gap-4">
        <div className="flex align-items-center gap-3">
          <Avatar
            src={contato?.avatar_url}
            alt={contato?.name ?? 'Contato'}
            width={56}
            height={56}
            className="border-circle flex-none"
            style={{ objectFit: 'cover' }}
          />
          <div className="flex flex-column min-w-0">
            <span className="text-lg font-semibold text-900 white-space-nowrap overflow-hidden text-overflow-ellipsis">
              {cliente?.nome ?? contato?.name ?? 'Contato'}
            </span>
            {cliente?.nome && (
              <span className="text-sm text-500 white-space-nowrap overflow-hidden text-overflow-ellipsis">
                {contato?.name}
              </span>
            )}
          </div>
        </div>

        {cliente ? (
          <Secao
            titulo="Cliente"
            icone="fa-regular fa-building"
          >
            <Campo
              rotulo="Razão social"
              valor={cliente.nome}
            />
            <Campo
              rotulo="CNPJ"
              valor={cliente.cnpj ? Mask(cliente.cnpj, '##.###.###/####-##') : null}
            />
            <Campo
              rotulo="Cliente desde"
              valor={cliente.created_at ? DateToBR(cliente.created_at, 'P') : null}
            />
            <EtiquetasDoCliente
              cliente={cliente}
              onAtualizado={aoAtualizarCliente}
            />
          </Secao>
        ) : (
          // Sem cliente a finalização fica bloqueada — dizer isso aqui evita o
          // atendente descobrir só na hora de encerrar.
          <div className="flex flex-column gap-3 border-1 border-orange-300 bg-orange-50 border-round-lg p-3">
            <div className="flex align-items-start gap-2">
              <i className="fa-regular fa-triangle-exclamation text-orange-600 mt-1" />
              <span className="text-sm text-orange-900">
                Este contato não está associado a nenhum cliente. Associe antes de finalizar o
                atendimento.
              </span>
            </div>
            {onEditar && (
              <Button
                label="Associar cliente"
                icon="fa-regular fa-link"
                size="small"
                onClick={onEditar}
              />
            )}
          </div>
        )}

        <Secao
          titulo="Contato"
          icone="fa-regular fa-user"
        >
          <Campo
            rotulo="Nome"
            valor={contato?.name}
          />
          <Campo
            rotulo="Telefone"
            valor={contato?.phone}
          />
          <Campo
            rotulo="Cadastrado em"
            valor={contato?.created_at ? DateToBR(contato.created_at, 'P') : null}
          />
        </Secao>

        {cliente && onEditar && (
          <Button
            label="Editar contato"
            icon="fa-regular fa-pen-to-square"
            outlined
            onClick={onEditar}
          />
        )}
      </div>
    </Sidebar>
  );
};

export default SidebarDetalhesContato;
