import { useContext } from 'react';
import { Badge } from 'primereact/badge';
import { Sidebar } from 'primereact/sidebar';
import Link from 'next/link';
import { LayoutContext } from './context/layoutcontext';

const AppProfileSidebar = () => {
  const { layoutState, setLayoutState } = useContext(LayoutContext);

  const onProfileSidebarHide = () => {
    setLayoutState((prevState) => ({
      ...prevState,
      profileSidebarVisible: false,
    }));
  };

  return (
    <Sidebar
      visible={layoutState.profileSidebarVisible}
      onHide={onProfileSidebarHide}
      position="right"
      className="layout-profile-sidebar w-full sm:w-25rem"
    >
      <div className="flex flex-column mx-auto md:mx-0">
        <span className="mb-2 font-semibold">Olá</span>
        <span className="text-color-secondary font-medium mb-5">Isabella Andolini</span>

        <ul className="list-none m-0 p-0">
          <li>
            <a className="cursor-pointer flex surface-border mb-3 p-3 align-items-center border-1 surface-border border-round hover:surface-hover transition-colors transition-duration-150">
              <span>
                <i className="pi pi-user text-xl text-primary"></i>
              </span>
              <div className="ml-3">
                <span className="mb-2 font-semibold">Perfil</span>
                <p className="text-color-secondary m-0">Lorem ipsum date visale</p>
              </div>
            </a>
          </li>
          <li>
            <a className="cursor-pointer flex surface-border mb-3 p-3 align-items-center border-1 surface-border border-round hover:surface-hover transition-colors transition-duration-150">
              <span>
                <i className="pi pi-cog text-xl text-primary"></i>
              </span>
              <div className="ml-3">
                <span className="mb-2 font-semibold">Configurações</span>
                <p className="text-color-secondary m-0">Exercitation veniam</p>
              </div>
            </a>
          </li>
          <li>
            <Link href={"/auth/logout"} className="cursor-pointer flex surface-border mb-3 p-3 align-items-center border-1 surface-border border-round hover:surface-hover transition-colors transition-duration-150">
              <span>
                <i className="pi pi-power-off text-xl text-primary"></i>
              </span>
              <div className="ml-3">
                <span className="mb-2 font-semibold">Sair</span>
                <p className="text-color-secondary m-0">Sed ut perspiciatis</p>
              </div>
            </Link>
          </li>
        </ul>
      </div>

      <div className="flex flex-column mt-5 mx-auto md:mx-0">
        <span className="mb-2 font-semibold">Notifications</span>
        <span className="text-color-secondary font-medium mb-5">You have 3 notifications</span>

        <ul className="list-none m-0 p-0">
          <li>
            <a className="cursor-pointer flex surface-border mb-3 p-3 align-items-center border-1 surface-border border-round hover:surface-hover transition-colors transition-duration-150">
              <span>
                <i className="pi pi-comment text-xl text-primary"></i>
              </span>
              <div className="ml-3">
                <span className="mb-2 font-semibold">Your post has new comments</span>
                <p className="text-color-secondary m-0">5 min ago</p>
              </div>
            </a>
          </li>
          <li>
            <a className="cursor-pointer flex surface-border mb-3 p-3 align-items-center border-1 surface-border border-round hover:surface-hover transition-colors transition-duration-150">
              <span>
                <i className="pi pi-trash text-xl text-primary"></i>
              </span>
              <div className="ml-3">
                <span className="mb-2 font-semibold">Your post has been deleted</span>
                <p className="text-color-secondary m-0">15min ago</p>
              </div>
            </a>
          </li>
          <li>
            <a className="cursor-pointer flex surface-border mb-3 p-3 align-items-center border-1 surface-border border-round hover:surface-hover transition-colors transition-duration-150">
              <span>
                <i className="pi pi-folder text-xl text-primary"></i>
              </span>
              <div className="ml-3">
                <span className="mb-2 font-semibold">Post has been updated</span>
                <p className="text-color-secondary m-0">3h ago</p>
              </div>
            </a>
          </li>
        </ul>
      </div>
    </Sidebar>
  );
};

export default AppProfileSidebar;
