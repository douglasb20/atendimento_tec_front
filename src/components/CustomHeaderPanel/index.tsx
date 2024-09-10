import { ReactNode, memo } from 'react';
import { Button } from 'primereact/button';
import { PanelHeaderTemplateOptions } from 'primereact/panel';

interface IProps {
  options: PanelHeaderTemplateOptions;
  subTitle?: ReactNode;
}

const CustomHeaderPanel = ({ options, subTitle }: IProps) => {
  const toggleIcon = options.collapsed ? 'pi-chevron-up' : 'pi-chevron-down';
  const radiusToggle = options.collapsed ? 'border-round' : '';
  const className = `${options.className} justify-content-between align-items-center ${radiusToggle}`;
  const titleClassName = `${options.titleClassName} pl-1`;

  return (
    <div
      className={className}
      style={{ transition: options.collapsed ? 'border-radius .5s' : '' }}
    >
      <div>
        <span
          className={`
              ${titleClassName} 
              font-bold text-2xl text-left 
              w-full vertical-align-middle
              text-10
            `}
        >
          {options.titleElement}
        </span>
        {subTitle && <p className=" text-base ml-1 mt-1">{subTitle}</p>}
      </div>
      <Button
        className={`py-2`}
        icon={`pi ${toggleIcon} text-1xl`}
        onClick={options.onTogglerClick}
        size="small"
      />
    </div>
  );
};

export default memo(CustomHeaderPanel);
