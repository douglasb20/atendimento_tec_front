'use client';

import { classNames } from 'primereact/utils';

import { EstadoPresenca } from '@/Interfaces';

/**
 * Cor e rótulo de cada estado.
 *
 * Branca para offline, e não cinza: sobre o avatar escuro do tema, o cinza
 * some. A borda que a separa do avatar é o que a torna visível nos dois modos.
 */
const APARENCIA: Record<EstadoPresenca, { cor: string; titulo: string }> = {
  online: { cor: 'var(--green-500)', titulo: 'Disponível' },
  ausente: { cor: 'var(--yellow-500)', titulo: 'Ausente' },
  offline: { cor: 'var(--surface-0)', titulo: 'Offline' },
};

type Props = {
  estado: EstadoPresenca;
  /** Diâmetro em rem. O padrão serve à lista; o popup usa menor. */
  tamanho?: number;
  /** Cor do anel - a do fundo em que a bolinha está. */
  corDaBorda?: string;
};

/** A bolinha de presença, sobreposta ao avatar. */
const BolinhaPresenca = ({
  estado,
  tamanho = 0.7,
  corDaBorda = 'var(--surface-0)',
}: Props) => {
  const { cor, titulo } = APARENCIA[estado];

  return (
    <span
      className={classNames('absolute border-circle')}
      style={{
        width: `${tamanho}rem`,
        height: `${tamanho}rem`,
        right: 0,
        bottom: 0,
        backgroundColor: cor,
        // Anel na cor do fundo: separa a bolinha do avatar, e é o que faz a
        // branca do offline aparecer no tema claro.
        boxShadow: `0 0 0 2px ${corDaBorda}`,
        // Só o offline precisa de contorno próprio - sem ele, branco sobre
        // fundo claro vira um buraco.
        ...(estado === 'offline' && { border: '1px solid var(--surface-400)' }),
      }}
      title={titulo}
    />
  );
};

export default BolinhaPresenca;
