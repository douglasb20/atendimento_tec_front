'use client';

import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { QuickReplyResponse } from '@/Interfaces';

type ListaRespostasRapidasProps = {
  aberta: boolean;
  respostas: QuickReplyResponse[];
  /** Índice destacado, controlado por quem usa (as setas vivem no textarea). */
  indiceAtivo: number;
  ancora: HTMLElement | null;
  onEscolher: (resposta: QuickReplyResponse) => void;
  onFechar: () => void;
  /** Abre o cadastro sem sair da conversa. */
  onAdicionar: () => void;
};

/**
 * As respostas disponíveis, sobre a caixa de mensagem.
 *
 * Uma linha por resposta, com o atalho em chip à esquerda e o texto ao lado -
 * lê como uma lista de comandos, que é o que é. Empilhar atalho e mensagem
 * dobrava a altura e fazia três respostas ocuparem meia tela.
 *
 * Em portal no `body`: a caixa de mensagem tem `border-round-lg` com recorte, e
 * a lista seria cortada dentro dela. A largura acompanha a da caixa, pelo
 * middleware `size`.
 *
 * A navegação por teclado **não** vive aqui - está no `onKeyDown` do textarea,
 * que nunca perde o foco. Um `onKeyDown` neste componente só funcionaria se ele
 * fosse focável, e aí o atendente perderia o cursor do texto a cada `/`.
 */
const ListaRespostasRapidas = ({
  aberta,
  respostas,
  indiceAtivo,
  ancora,
  onEscolher,
  onFechar,
  onAdicionar,
}: ListaRespostasRapidasProps) => {
  const itensRef = useRef<(HTMLButtonElement | null)[]>([]);

  const { refs, floatingStyles } = useFloating({
    open: aberta,
    placement: 'top-start',
    middleware: [
      offset(6),
      flip(),
      shift({ padding: 8 }),
      // A lista tem a largura da caixa de mensagem: uma coluna estreita ao
      // lado de um campo largo lê como um menu solto, não como parte dele.
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, { width: `${rects.reference.width}px` });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    refs.setReference(ancora);
  }, [ancora, refs]);

  // Acompanha a navegação por seta: sem isto, descer além do último visível
  // deixaria o destaque fora da área.
  useEffect(() => {
    itensRef.current[indiceAtivo]?.scrollIntoView({ block: 'nearest' });
  }, [indiceAtivo]);

  if (!aberta || typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* `mousedown` e não `click`: o clique num item dispara depois, e com
          `click` esta camada fecharia a lista antes da escolha chegar. */}
      <div
        className="fixed top-0 left-0 w-full h-full"
        style={{ zIndex: 99998 }}
        onMouseDown={onFechar}
      />

      <div
        ref={refs.setFloating}
        style={{ ...floatingStyles, zIndex: 99999 }}
        className="surface-overlay border-1 surface-border border-round-lg shadow-3 overflow-hidden"
      >
        <div className="flex align-items-center gap-2 px-3 pt-2 pb-1">
          <i className="fa-regular fa-bolt text-xs text-primary" />
          <span className="text-xs font-semibold text-color-secondary uppercase">
            Respostas rápidas
          </span>
        </div>

        {respostas.length ? (
          <div
            className="overflow-y-auto"
            style={{ maxHeight: '14rem' }}
          >
            {respostas.map((resposta, indice) => (
              <button
                key={resposta.id}
                ref={(el) => {
                  itensRef.current[indice] = el;
                }}
                type="button"
                // `mousedown` de novo: o `click` chegaria depois de a camada de
                // fora já ter fechado a lista.
                onMouseDown={(e) => {
                  e.preventDefault();
                  onEscolher(resposta);
                }}
                className={`flex align-items-center gap-3 w-full text-left border-none cursor-pointer px-3 py-2 ${
                  indice === indiceAtivo ? 'surface-100' : 'bg-transparent'
                } hover:surface-100`}
              >
                <span className="flex-none border-round px-2 py-1 text-sm font-semibold text-primary surface-100">
                  /{resposta.atalho}
                </span>

                <span className="flex-1 text-sm text-color white-space-nowrap overflow-hidden text-overflow-ellipsis">
                  {resposta.mensagem}
                </span>

                {resposta.anexo_nome && (
                  <i
                    className="fa-regular fa-paperclip flex-none text-xs text-500"
                    title={resposta.anexo_nome}
                  />
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="px-3 py-2 text-sm text-color-secondary">Nenhuma resposta encontrada.</div>
        )}

        {/* Abre o modal aqui mesmo. Navegar para a tela de cadastro tiraria o
            atendente da conversa que ele está atendendo - e o motivo de estar
            criando a resposta é justamente responder a ela. */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onAdicionar();
          }}
          className="flex align-items-center gap-2 w-full text-left border-none border-top-1 border-solid surface-border cursor-pointer bg-transparent px-3 py-2 text-sm text-color-secondary hover:surface-100"
        >
          <i className="fa-regular fa-plus text-xs" />
          Adicionar resposta rápida
        </button>
      </div>
    </>,
    document.body,
  );
};

export default ListaRespostasRapidas;
