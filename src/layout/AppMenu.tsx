import type { MenuModel } from '@/types';
import AppSubMenu from './AppSubMenu';
import { PrimeIcons } from 'primereact/api';

const AppMenu = () => {
  const model: MenuModel[] = [
    {
      label: 'Home',
      icon: PrimeIcons.HOME,
      items: [
        {
          label: 'Dashboard',
          icon: `pi pi-home pi-fw`,
          to: '/',
        },
        {
          label: 'Atendimentos',
          icon: `pi pi-pen-to-square pi-fw`,
          items: [
            {
              label: 'Chat',
              icon: `pi pi-comments pi-fw`,
              to: '/chat',
            },
            {
              label: 'Gerenciamento',
              icon: `pi pi-pen-to-square pi-fw`,
              to: '/atendimentos',
            },
          ],
        },
        {
          label: 'Relatórios',
          icon: `${PrimeIcons.BOOK} pi-fw`,
          to: '/relatorios',
        },
        {
          label: 'Clientes',
          icon: `${PrimeIcons.USERS} pi-fw`,
          items: [
            {
              label: 'Gerenciamento',
              // @ts-ignore
              icon: `${PrimeIcons.PEN_TO_SQUARE} pi-fw`,
              to: '/clientes',
            },
            {
              label: 'Contatos',
              icon: `${PrimeIcons.ID_CARD} pi-fw`,
              to: '/clientes/contatos',
            },
            {
              label: 'Etiquetas',
              icon: `${PrimeIcons.TAGS} pi-fw`,
              to: '/clientes/tags',
            },
          ],
        },
        {
          label: 'Usuários',
          // @ts-ignore
          icon: `${PrimeIcons.ADDRESS_BOOK} pi-fw`,
          to: '/usuarios',
        },
        {
          // No fim da lista: é o que se mexe ao montar o ambiente, não no dia a
          // dia do atendimento. Canais e integrações andam juntos — cada canal
          // aponta para uma integração.
          label: 'Configurações',
          icon: `${PrimeIcons.COG} pi-fw`,
          items: [
            {
              label: 'Canais',
              // @ts-ignore
              icon: `fa fa-plug text-2xl font-light text-center`,
              to: '/canais',
            },
            {
              label: 'Integrações',
              // @ts-ignore
              icon: `fa fa-puzzle-piece text-2xl font-light text-center`,
              to: '/integracoes',
            },
          ],
        },
      ],
    },
  ];

  return <AppSubMenu model={model} />;
};

export default AppMenu;
