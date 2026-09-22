'use client';

import type { MenuModel } from '@/types';
import AppSubMenu from './AppSubMenu';
import { PrimeIcons } from 'primereact/api';
import { usePermissoes } from '@/hooks/usePermissoes';

/**
 * Esconde o grupo cujos filhos sumiram todos.
 *
 * O `AppMenuitem` respeita `visible` item a item, mas não olha para os filhos:
 * sem isto, um Atendente veria "Configurações" abrindo para lugar nenhum.
 *
 * Grupo sem `items` é folha e passa direto - a decisão dele já veio pronta.
 */
const podaVazios = (itens: MenuModel[]): MenuModel[] =>
  itens
    .map((item) => {
      if (!item.items?.length) return item;

      const filhos = podaVazios(item.items).filter((f) => f.visible !== false);

      return { ...item, items: filhos, visible: item.visible !== false && filhos.length > 0 };
    })
    .filter((item) => item.visible !== false);

const AppMenu = () => {
  const { pode, podeAlguma, carregado } = usePermissoes();

  // Antes de o cookie ser lido, nada é escondido.
  //
  // O hook só o lê depois da montagem (ver lá o porquê), então no primeiro
  // render ninguém tem permissão nenhuma. Filtrar já nesse momento faria o menu
  // nascer vazio e encher um quadro depois - e quem não tem acesso a nada veria
  // o mesmo piscar. Liberar até a leitura é o inverso: o menu nasce completo e
  // encolhe, o que passa despercebido.
  const liberado = (permitido: boolean) => !carregado || permitido;

  // O menu deixou de ser constante: cada entrada consulta o que o usuário pode.
  // Esconder aqui é conveniência - quem digitar a rota direto chega à tela, e é
  // o backend que recusa as chamadas. Ver `usePermissoes`.
  const model: MenuModel[] = podaVazios([
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
              visible: liberado(pode('support.chat:view')),
            },
            {
              label: 'Gerenciamento',
              icon: `pi pi-pen-to-square pi-fw`,
              to: '/atendimentos',
              visible: liberado(pode('support:view')),
            },
            {
              // Junto do chat, e não em Conexões: é configuração do
              // atendimento, e quem cadastra é quem atende.
              label: 'Respostas rápidas',
              icon: `${PrimeIcons.COMMENT} pi-fw`,
              to: '/atendimentos/respostas-rapidas',
              visible: liberado(pode('quick.reply:view')),
            },
            {
              // Também no atendimento: o aviso entra na conversa, logo após a
              // saudação, e quem o liga é quem está atendendo o incidente.
              label: 'Avisos',
              // String direta: `PrimeIcons.MEGAPHONE` existe no runtime mas não na
              // tipagem instalada (o `.d.ts` está defasado em relação ao `api.js`).
              icon: 'pi pi-megaphone pi-fw',
              to: '/atendimentos/avisos',
              visible: liberado(pode('service.alert:view')),
            },
          ],
        },
        {
          label: 'Relatórios',
          icon: `${PrimeIcons.BOOK} pi-fw`,
          to: '/relatorios',
          visible: liberado(pode('support:view')),
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
              visible: liberado(pode('client:view')),
            },
            {
              label: 'Contatos',
              icon: `${PrimeIcons.ID_CARD} pi-fw`,
              to: '/clientes/contatos',
              visible: liberado(pode('contact:view')),
            },
            {
              label: 'Etiquetas',
              icon: `${PrimeIcons.TAGS} pi-fw`,
              to: '/clientes/tags',
              visible: liberado(pode('tag:view')),
            },
            {
              // O catálogo serve a contatos e clientes, mas é daqui que se
              // chega a ele: quem cadastra o campo é quem preenche os dois.
              label: 'Campos personalizados',
              // @ts-ignore
              icon: `fa fa-list-check text-2xl font-light text-center`,
              to: '/configuracoes/campos-personalizados',
              visible: liberado(pode('custom.field:view')),
            },
          ],
        },
        {
          label: 'Usuários',
          // @ts-ignore
          icon: `${PrimeIcons.ADDRESS_BOOK} pi-fw`,
          items: [
            {
              label: 'Cadastro',
              // @ts-ignore
              icon: `${PrimeIcons.USER_EDIT} pi-fw`,
              to: '/usuarios',
              visible: liberado(pode('user:view')),
            },
            {
              // Os grupos ficam sob Usuários, e não em Configurações: quem
              // cadastra uma pessoa é quem decide o acesso dela, e as duas
              // telas são usadas na mesma tarefa.
              label: 'Grupo de permissão',
              // @ts-ignore
              icon: `${PrimeIcons.LOCK} pi-fw`,
              to: '/usuarios/grupos-permissao',
              // Quem só consegue ver não tem o que fazer aqui: a tela existe
              // para montar e ajustar. Daí o OU com as permissões de escrita.
              visible: liberado(
                podeAlguma([
                  'permission_group:add',
                  'permission_group:update',
                  'permission_group:delete',
                ]),
              ),
            },
          ],
        },
        {
          // No fim da lista: é o que se mexe ao montar o ambiente, não no dia a
          // dia do atendimento. Canais e integrações andam juntos - cada canal
          // aponta para uma integração -, e é isso que o nome do grupo diz.
          label: 'Conexões',
          icon: `${PrimeIcons.LINK} pi-fw`,
          items: [
            {
              label: 'Canais',
              // @ts-ignore
              icon: `fa fa-plug text-2xl font-light text-center`,
              to: '/canais',
              visible: liberado(pode('channel:view')),
            },
            {
              label: 'Integrações',
              // @ts-ignore
              icon: `fa fa-puzzle-piece text-2xl font-light text-center`,
              to: '/integracoes',
              visible: liberado(pode('integration:view')),
            },
          ],
        },
      ],
    },
  ]);

  return <AppSubMenu model={model} />;
};

export default AppMenu;
