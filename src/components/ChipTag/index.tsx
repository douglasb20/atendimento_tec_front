import { Chip } from 'primereact/chip';
import { classNames } from 'primereact/utils';
import { memo } from 'react';

import { TagResponse } from '@/Interfaces';

type ChipTagProps = {
  tag: Pick<TagResponse, 'name' | 'color' | 'text_color'>;
  className?: string;
};

/** Quase preto em vez de preto puro: o contraste absoluto cansa a leitura. */
const CORES_DE_TEXTO = { light: '#ffffff', dark: '#1f2937' } as const;

/**
 * Etiqueta colorida.
 *
 * Aparece na listagem de clientes, no formulário e no painel do chat - daí viver
 * em `components/`. A cor do texto vem do cadastro, não de cálculo: o automático
 * por luminância erra nas cores médias, e às vezes a escolha é estética.
 */
const ChipTag = ({ tag, className }: ChipTagProps) => (
  <Chip
    label={tag.name}
    className={classNames('w-auto', className)}
    style={{
      backgroundColor: tag.color,
      color: CORES_DE_TEXTO[tag.text_color ?? 'light'],
    }}
    pt={{
      // O padding padrão do Chip é generoso demais para uma etiqueta: em linha
      // de tabela ou dentro de um select, várias delas empurram o conteúdo. O
      // tamanho da fonte vai no `label` porque a classe no container é
      // sobrescrita pelo estilo próprio dele.
      label: { className: 'text-sm px-1 my-1 line-height-2' },
    }}
  />
);

export default memo(ChipTag);
