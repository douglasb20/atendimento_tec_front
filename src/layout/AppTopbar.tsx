import type { AppTopbarRef } from '@/types';
import { Button } from 'primereact/button';
import { forwardRef, useContext, useImperativeHandle, useRef } from 'react';
import { LayoutContext } from './context/layoutcontext';
import StatusCanais from './StatusCanais';
import { PrimeIcons } from 'primereact/api';

const AppTopbar = forwardRef<AppTopbarRef>((props, ref) => {
  const { onMenuToggle, showProfileSidebar } = useContext(LayoutContext);
  const menubuttonRef = useRef(null);


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
      </div>

      <div className="topbar-end">
        <StatusCanais />

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
