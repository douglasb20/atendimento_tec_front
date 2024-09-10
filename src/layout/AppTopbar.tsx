import type { AppTopbarRef } from '@/types';
import { Button } from 'primereact/button';
import { forwardRef, useContext, useImperativeHandle, useRef } from 'react';
import AppBreadcrumb from './AppBreadCrumb';
import { LayoutContext } from './context/layoutcontext';
import { PrimeIcons } from 'primereact/api';

const AppTopbar = forwardRef<AppTopbarRef>((props, ref) => {
  const { onMenuToggle, showProfileSidebar, showConfigSidebar } = useContext(LayoutContext);
  const menubuttonRef = useRef(null);

  const onConfigButtonClick = () => {
    showConfigSidebar();
  };

  useImperativeHandle(ref, () => ({
    menubutton: menubuttonRef.current,
  }));

  return (
    <div className="layout-topbar">
      <div className="topbar-start">
        <button
          ref={menubuttonRef}
          type="button"
          className="topbar-menubutton p-link p-trigger"
          onClick={onMenuToggle}
        >
          <i className="pi pi-bars"></i>
        </button>

        <AppBreadcrumb className="topbar-breadcrumb"></AppBreadcrumb>
      </div>

      <div className="topbar-end">
        <ul className="topbar-menu">
          <li className="topbar-profile">
            <Button
              icon={PrimeIcons.BARS}
              text
              rounded
              onClick={showProfileSidebar}
            />
          </li>
        </ul>
      </div>
    </div>
  );
});

AppTopbar.displayName = 'AppTopbar';

export default AppTopbar;
