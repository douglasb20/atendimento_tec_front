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
          <Tooltip target=".custom-tooltip" />
          <i
            className="custom-tooltip ml-1 pi pi-question-circle text-sm text-primary"
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
