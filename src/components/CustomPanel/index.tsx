import { PropsWithChildren, ReactNode, memo, useState } from 'react';
import { Panel, PanelProps } from 'primereact/panel';
import CustomHeaderPanel from 'components/CustomHeaderPanel';

interface IProps extends PropsWithChildren, PanelProps {
  header?: ReactNode;
  startOpen?: boolean;
  className?: string;
  subTitle?: ReactNode;
}

const CustomPanel = ({ startOpen, subTitle, ...props }: IProps) => {
  const { children, header, className } = props;
  const [panelCollapsed, setPanelCollapsed] = useState(!startOpen);
  return (
    <Panel
      header={header}
      headerTemplate={(options) => (
        <CustomHeaderPanel
          options={options}
          subTitle={subTitle}
        />
      )}
      className={className + ' p-0 m-0 w-full'}
      toggleable
      collapsed={panelCollapsed}
      onToggle={(e) => setPanelCollapsed(e.value)}
      {...props}
      pt={{
        ...props.pt,
        root: { className: 'shadow-3 border-round-2xl' },
        content: { className: 'p-3' },
      }}
    >
      <div className="grid">{children}</div>
    </Panel>
  );
};

export default memo(CustomPanel);
