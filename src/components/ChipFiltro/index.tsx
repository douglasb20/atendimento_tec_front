'use client';

import { memo, useRef } from 'react';
import { OverlayPanel } from 'primereact/overlaypanel';
import { classNames } from 'primereact/utils';

type Props = {
  /** O nome do filtro, sempre visível: "Atendente", "Período". */
  rotulo: string;
  /** O que está selecionado: "Todos", "Douglas Amaro", "últimos 7 dias". */
  valor: string;
  /** Ícone à esquerda (classe do PrimeIcons ou Font Awesome). */
  icone?: string;
  /**
   * Verdadeiro quando o filtro está recortando algo.
   *
   * Pinta o chip com a cor de destaque, para quem bate o olho ver quais
   * filtros estão ativos sem ler todos - num relatório que circula, saber o
   * que está sendo filtrado é metade da informação.
   */
  ativo?: boolean;
  /**
   * O conteúdo do painel.
   *
   * Recebe `fechar` para a escolha de uma opção encerrar o painel - sem isso
   * ele fica aberto depois do clique, e quem escolheu precisa clicar fora
   * para seguir. Fica como função (e não `ReactNode`) justamente para o
   * filho ter acesso a ela.
   */
  children: (fechar: () => void) => React.ReactNode;
  /** Largura do painel; o padrão serve para uma lista de opções. */
  larguraDoPainel?: string;
};

/**
 * Um filtro como chip clicável, no lugar de um campo sempre aberto.
 *
 * O desenho vem do Wrike: a linha de filtros mostra **o estado de cada um**
 * em pouco espaço, e as opções só aparecem ao clicar. Com quatro ou cinco
 * filtros, campos abertos tomariam a tela inteira antes de a tabela começar.
 *
 * Sem botão de remover, ao contrário do Wrike: lá os filtros são escolhidos
 * pelo usuário e podem sair; aqui são fixos, e "remover" não significaria
 * nada - o estado "sem recorte" já é o valor "Todos".
 */
const ChipFiltro = ({
  rotulo,
  valor,
  icone,
  ativo = false,
  children,
  larguraDoPainel = '18rem',
}: Props) => {
  const painel = useRef<OverlayPanel>(null);

  return (
    <>
      <button
        type="button"
        onClick={(e) => painel.current?.toggle(e)}
        className={classNames(
          'inline-flex align-items-center gap-2 border-round-2xl px-3 py-2 cursor-pointer text-sm border-1 transition-colors transition-duration-150',
          // `chip-filtro-ativo` (SCSS) e não `bg-primary-100`: a escala
          // `--primary-*` é sempre clareada, nos dois modos, e o chip ativo
          // virava um retângulo claro ilegível no tema escuro.
          ativo
            ? 'chip-filtro-ativo'
            : 'surface-card surface-border text-color hover:surface-hover',
        )}
      >
        {icone && <i className={classNames(icone, 'text-xs opacity-70')} />}
        <span className="text-color-secondary">{rotulo}:</span>
        <span className="font-medium white-space-nowrap">{valor}</span>
        <i className="pi pi-chevron-down text-xs opacity-60" />
      </button>

      <OverlayPanel
        ref={painel}
        style={{ width: larguraDoPainel }}
        pt={{ content: { className: 'p-2' } }}
      >
        {children(() => painel.current?.hide())}
      </OverlayPanel>
    </>
  );
};

export default memo(ChipFiltro);
