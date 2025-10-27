import React, { ReactNode, useRef } from 'react';
import { classNames } from 'primereact/utils';
import { Button } from 'primereact/button';
import { MenuItem } from 'primereact/menuitem';
import { Menu } from 'primereact/menu';
import { ColumnBodyOptions } from 'primereact/column';
import { DateToBR, FormatCurrency, Mask } from 'service/Util';

export interface IActions<T = unknown> {
  label?: string;
  tooltip?: string;
  tooltipOptions?: object;
  className?: string;
  bgcolor?: 'primary' | 'danger' | 'warning' | 'info' | 'success' | (string & unknown);
  icon?: string;
  showLabel?: boolean;
  command?: (data?: T) => void | ReactNode | Promise<any>;
  isHidden?: (data?: T) => boolean | boolean;
  length?: number | null;
  totalActions?: number | null;
}

export interface IActionTable<T = any> extends IActions<T> {
  template?: (item: IActions<T>, data: T) => ReactNode;
}

function AcoesDataTable<T>({ actions, rowData }: { actions: IActionTable<T>[]; rowData: T }) {
  const menuRef = useRef<Menu>(null);

  const AcaoBodyTemplate = ({ rowData }) => {
    if (actions) {
      const colorActionButtons = ['p-button-primary', 'p-button-info', 'p-button-success'];
      if (actions.filter((e) => !e.isHidden || !e.isHidden(rowData)).length > 3) {
        const model: MenuItem[] = actions
          .filter((e) => !e.isHidden || !e.isHidden(rowData))
          .map((e) => ({
            icon: e.icon,
            label: e.label,
            command: () => e.command(rowData),
          }));
        return (
          <>
            <Button
              label="Opções"
              className="p-button-sm openMenu"
              iconPos="right"
              icon="pi pi-caret-down"
              onClick={(event) => menuRef.current.toggle(event)}
            />
            <Menu
              model={model}
              popup
              ref={menuRef}
              popupAlignment="right"
              className="w-auto"
            />
          </>
        );
      } else {
        return actions
          .filter((e) => !e.isHidden || !e.isHidden(rowData))
          .map((value, key) => {
            if (value.template) {
              return <React.Fragment key={key}>{value.template(value, rowData)}</React.Fragment>;
            } else {
              return (
                <Button
                  key={key}
                  tooltip={value.tooltip}
                  tooltipOptions={{ position: 'bottom' }}
                  className={classNames(
                    { hidden: value.isHidden && value.isHidden(rowData) },
                    ` ${
                      value.bgcolor ? 'p-button-' + value.bgcolor : colorActionButtons[key]
                    } ml-1`,
                  )}
                  label={value.showLabel && value.label}
                  icon={value.icon ? `${value.icon} text-base` : null}
                  onClick={() => value.command(rowData)}
                />
              );
            }
          });
      }
    }
  };

  return <AcaoBodyTemplate rowData={rowData} />;
}

export default AcoesDataTable;

export const BodyCurrency = (data: any, options: ColumnBodyOptions) =>
  data[options.field] && FormatCurrency(data[options.field], 'currency');

export const BodyPercentage = (data: any, options: ColumnBodyOptions) =>
  data[options.field] && FormatCurrency(data[options.field] / 100, 'percent');

export const BodyDecimal = (data: any, options: ColumnBodyOptions) =>
  data[options.field] && FormatCurrency(data[options.field], 'decimal');

export const BodyDateOnly = (data: any, options: ColumnBodyOptions) =>
  data[options.field] && DateToBR(data[options.field]);

export const BodyDateAndTime = (data: any, options: ColumnBodyOptions) =>
  data[options.field] && DateToBR(data[options.field], 'dh');

export const BodyCNPJ = (data: any, options: ColumnBodyOptions) =>
  data[options.field] && Mask(data[options.field], '##.###.###/####-##');

export const BodyCPF = (data: any, options: ColumnBodyOptions) =>
  data[options.field] && Mask(data[options.field], '###.###.###-##');

export const BodyPhone = (data: any, options: ColumnBodyOptions) =>
  data[options.field] && Mask(data[options.field], '(##) # ####-####');
