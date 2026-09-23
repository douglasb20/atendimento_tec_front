'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { classNames } from 'primereact/utils';

import Avatar from '@/components/Avatar';
import { ColegaResponse } from '@/Interfaces';
import { useChatInternoStore } from '@/store/useChatInternoStore';
import BolinhaPresenca from './BolinhaPresenca';
import JanelaInterna from './JanelaInterna';

const nomeDe = (colega: ColegaResponse) =>
  [colega.name, colega.last_name].filter(Boolean).join(' ');

/** Botão da barra de título - pequeno, sem moldura. */
const BotaoJanela = ({
  icone,
  titulo,
  onClick,
}: {
  icone: string;
  titulo: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    title={titulo}
    onClick={onClick}
    className="border-none bg-transparent text-white cursor-pointer flex align-items-center justify-content-center border-circle chat-interno-botao-janela"
    style={{ width: '1.75rem', height: '1.75rem', lineHeight: 1 }}
  >
    <i className={classNames(icone, 'text-sm')} />
  </button>
);

/**
 * A conversa interna numa janela flutuante, no canto inferior direito.
 *
 * ⚠️ **Não é `Dialog`.** O da PrimeReact é modal e bloquearia a tela atrás, o
 * oposto do que se quer: a graça é continuar atendendo enquanto se fala com o
 * colega. O padrão aqui é o do `VideoPreview` - portal no `body`, posição fixa.
 *
 * Montado em `(main)/layout.tsx`, fora de `/chat`, para sobreviver à navegação:
 * abrir a conversa, ir a Clientes e continuar conversando.
 */
const PopupInterno = () => {
  const modo = useChatInternoStore((s) => s.modo);
  const minimizado = useChatInternoStore((s) => s.minimizado);
  const ativo = useChatInternoStore((s) => s.ativo);
  const presencas = useChatInternoStore((s) => s.presencas);
  const conversas = useChatInternoStore((s) => s.conversas);
  const alternarMinimizado = useChatInternoStore((s) => s.alternarMinimizado);
  const fechar = useChatInternoStore((s) => s.fechar);
  const encaixar = useChatInternoStore((s) => s.encaixar);

  // Portais não existem no servidor: sem o guard, o HTML renderizado no
  // servidor difere do do cliente e o React reclama de hidratação.
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  // Esc fecha - exceto com foco num campo, senão sairia no meio da digitação.
  useEffect(() => {
    if (modo !== 'popup') return;

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;

      const alvo = evento.target as HTMLElement | null;
      const digitando =
        alvo?.tagName === 'INPUT' ||
        alvo?.tagName === 'TEXTAREA' ||
        alvo?.isContentEditable;

      if (!digitando) fechar();
    };

    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [modo, fechar]);

  if (!montado || modo !== 'popup' || !ativo) return null;

  const naoLidasDeOutros = conversas
    .filter((conversa) => conversa.outro.id !== ativo.id)
    .reduce((soma, conversa) => soma + conversa.nao_lidas, 0);

  return createPortal(
    <div
      className={classNames('chat-interno-popup', minimizado && 'chat-interno-popup--minimizado')}
    >
      <div
        className="chat-interno-popup__titulo"
        role="button"
        tabIndex={0}
        // A barra inteira alterna, como no Gmail: mirar no botão de 1,75rem
        // para recolher a janela é preciso demais.
        onClick={alternarMinimizado}
        onKeyDown={(e) => e.key === 'Enter' && alternarMinimizado()}
      >
        <div className="relative flex-shrink-0">
          <Avatar
            src={ativo.avatar_url}
            alt={nomeDe(ativo)}
            width={28}
            height={28}
            className="border-circle"
            style={{ objectFit: 'cover' }}
          />
          {/* O anel acompanha a barra de título, não a superfície do painel. */}
          <BolinhaPresenca
            estado={presencas[ativo.id] ?? 'offline'}
            tamanho={0.55}
            corDaBorda="var(--primary-color)"
          />
        </div>

        <span className="flex-1 font-medium text-sm white-space-nowrap overflow-hidden text-overflow-ellipsis">
          {nomeDe(ativo)}
        </span>

        {/* Minimizado, avisa que há mensagem de outra pessoa esperando. */}
        {minimizado && naoLidasDeOutros > 0 && (
          <span className="bg-red-500 text-white text-xs border-circle flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: '1.25rem', height: '1.25rem' }}
            title={`${naoLidasDeOutros} mensagem(ns) de outros colegas`}
          >
            {naoLidasDeOutros}
          </span>
        )}

        <div
          className="flex align-items-center gap-1 flex-shrink-0"
          // Os botões têm ação própria: sem isto, o clique subiria para a barra
          // e minimizaria junto.
          onClick={(e) => e.stopPropagation()}
        >
          <BotaoJanela
            icone={minimizado ? 'fa-regular fa-chevron-up' : 'fa-regular fa-minus'}
            titulo={minimizado ? 'Expandir' : 'Minimizar'}
            onClick={alternarMinimizado}
          />
          {/* O caminho de volta: sem ele, quem destacou só sairia fechando a
              conversa e abrindo de novo pela lista. */}
          <BotaoJanela
            icone="fa-regular fa-arrow-down-left-and-arrow-up-right-to-center"
            titulo="Voltar ao painel"
            onClick={encaixar}
          />
          <BotaoJanela
            icone="fa-regular fa-xmark"
            titulo="Fechar"
            onClick={fechar}
          />
        </div>
      </div>

      {!minimizado && (
        <div className="chat-interno-popup__corpo">
          <JanelaInterna semCabecalho />
        </div>
      )}
    </div>,
    document.body,
  );
};

export default PopupInterno;
