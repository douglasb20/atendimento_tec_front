import { Tooltip } from 'primereact/tooltip';
import { classNames } from 'primereact/utils';
import { memo } from 'react';

interface IProps {
  text: string;
  htmlFor?: string;
  className?: string;
  required?: boolean;
  textHelp?: string;
}

const LabelPlus = (props: IProps) => {
  const { text, textHelp, required, htmlFor, className } = props;

  return (
    <div className="flex flex-row align-items-center">
      <label
        htmlFor={htmlFor}
        className={classNames(className, { 'label-required': required })}
      >
        {text}
      </label>
      {textHelp && (
        <>
          {/* `info-circle`, não `question-circle`: o texto explica o que a
              opção faz, não responde a uma dúvida - e o ícone de informação é
              o que o resto do mercado usa para isso. */}
          <Tooltip target=".custom-tooltip" />
          <i
            className="custom-tooltip ml-1 pi pi-info-circle text-sm text-primary cursor-help"
            data-pr-tooltip={textHelp}
            data-pr-position="right"
            data-pr-mousetrack={true}
            data-pr-mousetracktop={0}
          ></i>
        </>
      )}
    </div>
  );
};

export default memo(LabelPlus);
