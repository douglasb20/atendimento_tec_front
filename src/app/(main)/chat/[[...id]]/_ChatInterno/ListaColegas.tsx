'use client';

import { useMemo, useState } from 'react';
import { Badge } from 'primereact/badge';
import { InputText } from 'primereact/inputtext';
import { classNames } from 'primereact/utils';

import Avatar from '@/components/Avatar';
import { ColegaResponse, InternalMessageType } from '@/Interfaces';
import { useChatInternoStore } from '@/store/useChatInternoStore';
import BolinhaPresenca from './BolinhaPresenca';

/** O nome completo, sem espaço sobrando quando não há sobrenome. */
const nomeDe = (colega: ColegaResponse) =>
  [colega.name, colega.last_name].filter(Boolean).join(' ');

/** Prévia da última mensagem: mídia vira rótulo, texto aparece cru. */
const previaDaMensagem = (tipo: InternalMessageType, conteudo: string | null) => {
  if (tipo === InternalMessageType.TEXT) return conteudo ?? '';

  const rotulos: Record<string, string> = {
    [InternalMessageType.IMAGE]: '📷 Foto',
    [InternalMessageType.VIDEO]: '🎥 Vídeo',
    [InternalMessageType.DOCUMENT]: '📎 Documento',
    [InternalMessageType.AUDIO]: '🎵 Áudio',
    [InternalMessageType.VOICE]: '🎤 Mensagem de voz',
  };

  // Com legenda, ela diz mais que o rótulo do tipo.
  return conteudo?.trim() || rotulos[tipo] || 'Anexo';
};

/** Hoje mostra a hora; antes disso, a data. */
const quando = (iso: string | null) => {
  if (!iso) return '';

  const data = new Date(iso);
  const hoje = new Date();
  const mesmoDia = data.toDateString() === hoje.toDateString();

  return mesmoDia
    ? data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

type Props = {
  onAbrir: (colega: ColegaResponse) => void;
  /** Abre direto em janela flutuante, pulando o painel. */
  onDestacar: (colega: ColegaResponse) => void;
};

/**
 * Os colegas, com quem está online e o que cada um mandou por último.
 *
 * A lista é **fixa**: todo mundo aparece, com conversa ou sem. Quem nunca
 * conversou com alguém precisa achá-lo para começar - mostrar só as conversas
 * existentes deixaria a primeira mensagem sem caminho.
 */
const ListaColegas = ({ onAbrir, onDestacar }: Props) => {
  const [busca, setBusca] = useState('');

  const colegas = useChatInternoStore((s) => s.colegas);
  const presencas = useChatInternoStore((s) => s.presencas);
  const conversas = useChatInternoStore((s) => s.conversas);
  const ativo = useChatInternoStore((s) => s.ativo);

  /**
   * Junta colega e conversa, ordenando por atividade.
   *
   * Quem tem mensagem recente sobe; o resto vem em ordem alfabética. Ordenar só
   * por nome faria a conversa em andamento se perder no meio da lista.
   */
  const itens = useMemo(() => {
    const porColega = new Map(conversas.map((conversa) => [conversa.outro.id, conversa]));

    const termo = busca.trim().toLowerCase();

    return colegas
      .filter((colega) => !termo || nomeDe(colega).toLowerCase().includes(termo))
      .map((colega) => ({ colega, conversa: porColega.get(colega.id) ?? null }))
      .sort((a, b) => {
        const qa = a.conversa?.last_message_at
          ? new Date(a.conversa.last_message_at).getTime()
          : 0;
        const qb = b.conversa?.last_message_at
          ? new Date(b.conversa.last_message_at).getTime()
          : 0;

        if (qa !== qb) return qb - qa;

        return nomeDe(a.colega).localeCompare(nomeDe(b.colega));
      });
  }, [colegas, conversas, busca]);

  return (
    <div className="flex flex-column h-full">
      <div className="p-2 border-bottom-1 surface-border">
        <span className="p-input-icon-left w-full">
          <i className="fa-regular fa-magnifying-glass ml-1 text-sm" />
          <InputText
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar colega"
            className="w-full p-inputtext-sm border-round-2xl"
          />
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!itens.length && (
          <p className="text-center text-500 text-sm p-4">
            {busca ? 'Nenhum colega encontrado.' : 'Nenhum colega disponível.'}
          </p>
        )}

        {itens.map(({ colega, conversa }) => (
          <div
            key={colega.id}
            role="button"
            tabIndex={0}
            onClick={() => onAbrir(colega)}
            onKeyDown={(e) => e.key === 'Enter' && onAbrir(colega)}
            className={classNames(
              // `colega-item` é o grupo que revela o botão de destacar no
              // hover (regra em `styles/layout/_utils.scss`).
              'colega-item flex align-items-center gap-2 p-2 cursor-pointer border-bottom-1 surface-border',
              ativo?.id === colega.id ? 'surface-200' : 'hover:surface-100',
            )}
          >
            <div className="relative flex-shrink-0">
              <Avatar
                src={colega.avatar_url}
                alt={nomeDe(colega)}
                width={40}
                height={40}
                className="border-circle"
                style={{ objectFit: 'cover' }}
              />

              {/* Sobre o avatar, como na lista de atendimentos: o estado não
                  disputa espaço com o nome e fica onde o olho já está. */}
              <BolinhaPresenca estado={presencas[colega.id] ?? 'offline'} />
            </div>

            <div className="flex flex-column flex-1 min-w-0">
              <div className="flex align-items-baseline justify-content-between gap-2">
                <span className="font-medium text-sm white-space-nowrap overflow-hidden text-overflow-ellipsis">
                  {nomeDe(colega)}
                </span>
                {conversa?.last_message_at && (
                  <span className="text-xs text-500 flex-shrink-0">
                    {quando(conversa.last_message_at)}
                  </span>
                )}
              </div>

              <div className="flex align-items-center justify-content-between gap-2">
                <span className="text-xs text-500 white-space-nowrap overflow-hidden text-overflow-ellipsis">
                  {conversa?.ultima_mensagem
                    ? previaDaMensagem(
                        conversa.ultima_mensagem.type,
                        conversa.ultima_mensagem.content,
                      )
                    : ''}
                </span>

                <div className="flex align-items-center gap-1 flex-shrink-0">
                  {/* Só no hover, como no Gmail e no Whaticket: sempre visível,
                      competiria com o badge e poluiria a lista inteira. */}
                  <button
                    type="button"
                    title="Abrir em janela flutuante"
                    className="colega-destacar border-none bg-transparent text-500 cursor-pointer p-1 border-circle flex align-items-center justify-content-center"
                    onClick={(e) => {
                      // Sem isto o clique sobe para o item e abre no painel,
                      // que é justamente o que este botão evita.
                      e.stopPropagation();
                      onDestacar(colega);
                    }}
                  >
                    <i className="fa-regular fa-arrow-up-right-from-square text-xs" />
                  </button>

                  {Boolean(conversa?.nao_lidas) && (
                    <Badge
                      value={conversa!.nao_lidas}
                      severity="danger"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ListaColegas;
