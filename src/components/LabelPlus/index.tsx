import { Tooltip } from 'primereact/tooltip';
import { classNames } from 'primereact/utils';
import { memo, useRef, type ReactNode } from 'react';

interface IProps {
  text: string;
  htmlFor?: string;
  className?: string;
  required?: boolean;
  textHelp?: ReactNode;
}

const LabelPlus = (props: IProps) => {
  const { text, textHelp, required, htmlFor, className } = props;
  const iconeAjuda = useRef<HTMLElement>(null);

  return (
    // Margens e tipografia pertencem ao conjunto: aplicar mb-2 só no label
    // fazia o ícone centralizar pela caixa com margem e ficar abaixo do texto.
    <div className={className}>
      <div className="flex flex-row align-items-center">
        <label htmlFor={htmlFor} className={classNames({ 'label-required': required })}>
          {text}
        </label>
        {textHelp && (
          <>
            <Tooltip target={iconeAjuda}
              style={{ maxWidth: 'min(26rem, calc(100vw - 2rem))', whiteSpace: 'pre-line' }}>
              {textHelp}
            </Tooltip>
            <i
              ref={iconeAjuda}
              className="custom-tooltip ml-1 pi pi-info-circle text-sm text-primary cursor-help flex-shrink-0"
              data-pr-position="right"
              data-pr-mousetrack={true}
              data-pr-mousetracktop={0}
            ></i>
          </>
        )}
      </div>
    </div>
  );
};

export default memo(LabelPlus);
