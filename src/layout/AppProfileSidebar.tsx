'use client';

import { useContext } from 'react';
import Link from 'next/link';
import { parseCookies } from 'nookies';
import { Sidebar } from 'primereact/sidebar';

import { usePermissoes } from '@/hooks/usePermissoes';
import { UserInfo } from '@/Interfaces';
import { LayoutContext } from './context/layoutcontext';

/** Nome e e-mail de quem está logado, do cookie `userInfo`. */
const usuarioLogado = (): { nome: string; email: string } => {
  try {
    const cru = parseCookies()['userInfo'];
    if (!cru) return { nome: '', email: '' };

    const info = JSON.parse(cru) as UserInfo;
    return { nome: info?.name ?? '', email: info?.email ?? '' };
  } catch {
    return { nome: '', email: '' };
  }
};

const ITEM_CLASSE =
  'cursor-pointer flex surface-border mb-3 p-3 align-items-center border-1 surface-border border-round hover:surface-hover transition-colors transition-duration-150 no-underline text-color';

const AppProfileSidebar = () => {
  const { layoutState, setLayoutState } = useContext(LayoutContext);
  const { ehSuperusuario } = usePermissoes();
  const { nome, email } = usuarioLogado();

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
        {/* Nome e e-mail reais. Este painel vinha do template com "Isabella
            Andolini" cravado, três notificações falsas e itens que não levavam
            a lugar nenhum — tudo isso saiu. */}
        <span className="text-color-secondary font-medium">{nome || 'Usuário'}</span>
        <span className="text-color-secondary text-sm mb-5">{email}</span>

        <ul className="list-none m-0 p-0">
          {/* Só o usuário master: estes ajustes mudam o comportamento para
              todos, e o backend recusa qualquer outro com 403. */}
          {ehSuperusuario && (
            <li>
              <Link
                href="/configuracoes/sistema"
                className={ITEM_CLASSE}
                onClick={onProfileSidebarHide}
              >
                <span>
                  <i className="pi pi-cog text-xl text-primary"></i>
                </span>
                <div className="ml-3">
                  <span className="mb-2 font-semibold">Configurações do sistema</span>
                  <p className="text-color-secondary m-0">Prazos, limites e servidor de e-mail</p>
                </div>
              </Link>
            </li>
          )}

          <li>
            <Link
              href={'/auth/logout'}
              className={ITEM_CLASSE}
            >
              <span>
                <i className="pi pi-power-off text-xl text-primary"></i>
              </span>
              <div className="ml-3">
                <span className="mb-2 font-semibold">Sair</span>
                <p className="text-color-secondary m-0">Encerrar a sessão neste navegador</p>
              </div>
            </Link>
          </li>
        </ul>
      </div>
    </Sidebar>
  );
};

export default AppProfileSidebar;
