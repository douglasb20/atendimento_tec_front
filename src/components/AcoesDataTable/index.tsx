import React, { useEffect, useState, memo, ReactNode } from 'react';
import { classNames } from 'primereact/utils';
import { Button } from 'primereact/button';
import $ from 'jquery';
import { DateToBR, FormatCurrency } from 'service/Util';
import { ColumnBodyOptions } from 'primereact/column';

export interface IActions<T = any> {
  label?: string;
  tooltip?: string;
  tooltipOptions?: object;
  className?: string;
  bgcolor?: string;
  icon?: string;
  command?: (data?: T) => void;
  length?: number | null;
  totalActions?: number | null;
}

type GetComponentProps<T = any> = T extends React.ComponentType<infer P> | React.Component<infer P>
  ? P
  : any;
export interface IActionTable<T = any> extends IActions<T> {
  template?: (item: IActions<T>, data: T) => ReactNode;
}

interface IProps<T = any> {
  rowData: T;
}

type NewProps = {
  actions: IActionTable[];
} & GetComponentProps<IProps>;

const AcoesDataTable = ({ actions, rowData }: NewProps) => {
  const [inAni] = useState('animate__fadeIn');
  const [outAni] = useState('animate__fadeOut');

  const containerClass = classNames({
    'p-menu': true,
    hidden: true,
    animate__animated: true,
    animate__fadeOut: true,
    animate__faster: true,
    absolute: true,
    'z-1': true,
    'mt-1': true,
    'w-max': true,
  });

  const toggleMenu = async (el) => {
    let menu = $(el);

    if (menu.hasClass('isOpened')) {
      closeMenu(el);
    } else {
      if ($('.isOpened').length) {
        await closeMenu('.isOpened');
      }
      menu.removeClass('hidden');
      menu.removeClass(outAni);
      menu.addClass(inAni);
      menu.addClass('isOpened');
    }
  };

  const closeMenu = async (el) => {
    new Promise<void>((resolve) => {
      let menu = $(el);

      menu.removeClass(inAni);
      menu.addClass(outAni);
      menu.removeClass('isOpened');

      setTimeout(() => {
        menu.addClass('hidden');
        resolve();
      }, 400);
    });
  };

  // @ts-ignore
  useEffect(() => {
    $(document).on('click', async function (e) {
      if (!$(e.target).closest('.openMenu').length) {
        await closeMenu('.isOpened');
      }
    });

    return () => $(document).off('click');
    //eslint-disable-next-line
  }, []);

  const AcaoBodyTemplate = ({ rowData }) => {
    if (actions) {
      const colorActionButtons = ['p-button-primary', 'p-button-info', 'p-button-success'];
      if (actions.length > 3) {
        return (
          <div className="menu-dropdown w-min relative">
            <Button
              label="Opções"
              className="p-button-sm openMenu"
              iconPos="right"
              icon="pi pi-caret-down"
              onClick={() => toggleMenu(`#menu-${rowData.id}`)}
            />

            <div
              id={`menu-${rowData.id}`}
              className={containerClass}
              style={{ right: '0px' }}
            >
              <ul
                className="p-menu-list"
                role="menu"
              >
                {actions.map((item: IActionTable, key) => {
                  item.totalActions = actions.length;
                  if (item.template) {
                    return (
                      <React.Fragment key={key}>{item.template(item, rowData)}</React.Fragment>
                    );
                  }
                  return (
                    <li
                      key={Math.random() * 50000}
                      className="p-menuitem"
                      role="none"
                      onClick={() => item.command(rowData)}
                    >
                      <a
                        href="#"
                        className="p-menuitem-link"
                        role="menuitem"
                        tabIndex={0}
                      >
                        <span className={'p-menuitem-icon ' + item.icon}></span>
                        <span className="p-menuitem-text">{item.label}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      } else {
        return actions.map((value, key) => {
          if (value.template) {
            return <React.Fragment key={key}>{value.template(value, rowData)}</React.Fragment>;
          } else {
            return (
              <Button
                key={key}
                size="small"
                tooltip={value.tooltip}
                tooltipOptions={{ position: 'bottom' }}
                className={` ${
                  value.bgcolor ? 'p-button-' + value.bgcolor : colorActionButtons[key]
                } p-button-sm ml-1`}
                icon={`${value.icon} text-base`}
                onClick={() => value.command(rowData)}
              />
            );
          }
        });
      }
    }
  };

  //@ts-ignore
  return <AcaoBodyTemplate rowData={rowData} />;
};

export const BodyCurrency = (data: any, options: ColumnBodyOptions) =>
  data[options.field] && FormatCurrency(data[options.field]);

export const BodyPercentage = (data: any, options: ColumnBodyOptions) =>
  data[options.field] && FormatCurrency(data[options.field], 'currency');

export const BodyDecimal = (data: any, options: ColumnBodyOptions) =>
  data[options.field] && FormatCurrency(data[options.field], 'decimal');

export const BodyDateOnly = (data: any, options: ColumnBodyOptions) =>
  data[options.field] && DateToBR(data[options.field]);

export const BodyDateAndTime = (data: any, options: ColumnBodyOptions) =>
  DateToBR(data[options.field], 'hm');

//@ts-ignore
export default memo(AcoesDataTable);
