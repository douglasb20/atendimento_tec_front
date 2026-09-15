import { addHours, addMinutes, isAfter, parseISO } from 'date-fns';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import { MenuItem } from 'primereact/menuitem';
import { useRef } from 'react';

import { SupportChatMessageResponse } from '@/Interfaces';

type MenuMessageProps = {
  menuModel: MenuItem[];
  message: SupportChatMessageResponse;
  bottomEl: HTMLDivElement;
};

const isAfter15min = (input: string) => {
  const date = parseISO(input);

  // Data + 15 minutos
  const limite = addMinutes(date, 15);

  // Agora > data + 15?
  const passou15min = isAfter(new Date(), limite);

  return passou15min;
};

export const isAfter60Hour = (input: string) => {
  const date = parseISO(input);

  // Data + 60 horas
  const limite = addHours(date, 60);
  // Agora > data + 15?
  const passou60horas = isAfter(new Date(), limite);

  return passou60horas;
};

/**
 * Se a mensagem aceita ser revogada no WhatsApp.
 *
 * Mesma regra usada pelo item 'Apagar' do menu e pela seleção múltipla — as
 * duas precisam concordar, senão a seleção ofereceria o que o apagar recusa.
 */
export const podeApagar = (message: SupportChatMessageResponse) =>
  !message.is_deleted &&
  !message.pending &&
  !message.hidden_at &&
  message.from_me &&
  !isAfter60Hour(message.datetime);

const MenuMessageComponent = ({ menuModel, message, bottomEl }: MenuMessageProps) => {
  const menuRef = useRef<{ [key: string]: Menu | null }>({});

  // Revogada não tem conteúdo para responder, citar ou baixar; pendente ainda
  // não existe no WhatsApp, então nenhuma ação de lá se aplica.
  // Oculta entra na mesma regra da revogada: não há conteúdo a citar,
  // baixar ou editar.
  const semAcoes = message.is_deleted || message.pending || !!message.hidden_at;

  const newModel = menuModel.map((item) => {
    const newItem: MenuItem = { ...item };
    newItem.data = message;

    switch (newItem.id) {
      case 'reply':
        newItem.visible = !semAcoes;
        break;
      case 'edit':
        newItem.visible =
          !semAcoes &&
          !isAfter15min(message.datetime) &&
          message.from_me &&
          message.message_id.length === 22;
        break;
      case 'delete':
        newItem.visible = podeApagar(message);
        break;
      // Diferente do 'delete': qualquer mensagem ainda visível pode entrar na
      // seleção. O que não couber na revogação do WhatsApp é ocultado só do
      // nosso lado; o que já está oculto não tem o que apagar de novo.
      case 'select':
        newItem.visible = !semAcoes;
        break;
      case 'download':
        // Mídia expirada pela retenção não tem arquivo no storage para baixar.
        newItem.visible = !semAcoes && message.has_media && !message.media_expired;
        break;
    }

    return newItem;
  });

  // Sem nenhuma ação disponível, o botão abriria um menu vazio.
  if (!newModel.some((item) => item.visible !== false)) return null;

  return (
    <div
      className={`
                  message-chevron 
                  hidden
                  absolute right-0 top-0 z-1 mt-2 mr-2
                `}
    >
      <Menu
        ref={(el) => {
          menuRef.current[message.id] = el;
        }}
        model={newModel}
        popupAlignment={message.from_me ? 'right' : 'left'}
        onShow={() => {
          bottomEl?.classList.add('no-scroll');
        }}
        onHide={() => {
          bottomEl?.classList.remove('no-scroll');
        }}
        popup
      />
      <Button
        className={`bg-gray-300 border-${message.from_me ? 'gray' : 'primary'}-500 outline-none shadow-none p-0`}
        style={{ width: '1.5rem', height: '1.5rem' }}
        text
        rounded
        outlined
        onClick={(event) => menuRef.current[message.id]?.toggle(event)}
        icon="fa-regular fa-chevron-down"
        pt={{
          label: {
            className: 'p-0 m-0',
          },
          icon: {
            className: 'p-0 m-0',
          },
        }}
      />
    </div>
  );
};

export default MenuMessageComponent;
