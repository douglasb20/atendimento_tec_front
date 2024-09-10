import Link from 'next/link';
import { useContext } from 'react';
import AppMenu from './AppMenu';
import { LayoutContext } from './context/layoutcontext';
import { MenuProvider } from './context/menucontext';
import { LayoutState } from '../types/layout';
import Image from 'next/image';

const AppSidebar = () => {
  const { setLayoutState } = useContext(LayoutContext);
  const anchor = () => {
    setLayoutState((prevLayoutState: LayoutState) => ({
      ...prevLayoutState,
      anchored: !prevLayoutState.anchored,
    }));
  };
  return (
    <>
      <div className="sidebar-header">
        <Link
          href="/"
          className="app-logo"
        >
          <div className="app-logo-normal ">
            <Image
              alt=""
              src="/images/logoext.png"
              width={160}
              height={60}
            />
          </div>
          <div className="app-logo-small">
            <Image
              alt=""
              src="/images/logo.png"
              width={50}
              height={50}
              className="app-logo-small"
            />
          </div>
        </Link>
        <button
          className="layout-sidebar-anchor p-link z-2 mb-2"
          type="button"
          onClick={anchor}
        ></button>
      </div>

      <div className="layout-menu-container">
        <MenuProvider>
          <AppMenu />
        </MenuProvider>
      </div>
    </>
  );
};

export default AppSidebar;
