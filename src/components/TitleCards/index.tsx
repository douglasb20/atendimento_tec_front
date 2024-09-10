import React from 'react';
import { Button } from 'primereact/button';

interface ITitleCardsProps {
  clearFilterAction?: React.MouseEventHandler<HTMLButtonElement>;
  filterAction?: React.MouseEventHandler<HTMLButtonElement>;
  title?: string;
  buttons?: IButtonsOthers[];
}

export interface IButtonsOthers {
  action?: (e?: any) => void;
  label: string;
  icon?: string;
  bgColor?: string;
}

const TitleCards = (props: ITitleCardsProps) => {
  const { clearFilterAction, filterAction, buttons, title } = props;

  const OthersButtons = (buttonsProps: IButtonsOthers[]) => {
    return buttonsProps.map((button: IButtonsOthers, key: number | string) => {
      return (
        <Button
          key={key}
          icon={button.icon}
          className={`border-1 p-button-sm ${button.bgColor ? 'p-button-' + button.bgColor : ''}`}
          label={button.label}
          onClick={button.action}
        />
      );
    });
  };

  return (
    <div
      className={`flex ${!clearFilterAction && !filterAction && buttons ? 'flex-column md:flex-row align-items-center gap-2' : 'flex-column'} justify-content-between mb-3`}
    >
      <>
        {title ? <span className="text-900 flex-1 text-xl font-semibold">{title}</span> : null}
        {!clearFilterAction && !filterAction && buttons ? OthersButtons(buttons) : null}
        {clearFilterAction || filterAction ? (
          <div className="flex gap-2 mt-5">
            <>
              <div className="flex gap-2 flex-1">
                {clearFilterAction ? (
                  <Button
                    icon="pi pi-filter-slash"
                    type="button"
                    className="p-button-sm p-button-outlined p-button-warning"
                    label={'Limpar Filtros'}
                    onClick={clearFilterAction}
                  />
                ) : (
                  ''
                )}
                {filterAction ? (
                  <Button
                    icon="pi pi-fw pi-filter"
                    className="border-1 p-button-sm p-button-outlined"
                    label="Filtros"
                    onClick={filterAction}
                  />
                ) : (
                  ''
                )}
              </div>
              {buttons ? OthersButtons(buttons) : ''}
            </>
          </div>
        ) : null}
      </>
    </div>
  );
};

export default TitleCards;
