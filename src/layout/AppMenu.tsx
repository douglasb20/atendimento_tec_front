import type { MenuModel } from '@/types';
import AppSubMenu from './AppSubMenu';
import { PrimeIcons } from 'primereact/api';

const AppMenu = () => {
  const model: MenuModel[] = [
    {
      label: 'Dashboards',
      icon: PrimeIcons.HOME,
      items: [
        {
          label: 'Home',
          icon: `pi pi-home pi-fw`,
          to: '/',
        },
        {
          label: 'Atendimentos',
          icon: `pi pi-pen-to-square pi-fw`,
          to: '/atendimentos',
        },
        {
          label: 'Relatórios',
          icon: `${PrimeIcons.BOOK} pi-fw`,
          to: '/relatorios',
        },
        {
          label: 'Clientes',
          icon: `${PrimeIcons.USERS} pi-fw`,
          to: '/clientes',
        },
        {
          label: 'Usuários',
          // @ts-ignore
          icon: `${PrimeIcons.ADDRESS_BOOK} pi-fw`,
          to: '/usuarios',
        },
      ],
    },
  ];

  return <AppSubMenu model={model} />;
};

export default AppMenu;
