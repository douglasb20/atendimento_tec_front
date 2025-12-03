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

const isAfter60Hour = (input: string) => {
  const date = parseISO(input);

  // Data + 60 horas
  const limite = addHours(date, 60);
  // Agora > data + 15?
  const passou60horas = isAfter(new Date(), limite);

  return passou60horas;
};

const MenuMessageComponent = ({ menuModel, message, bottomEl }: MenuMessageProps) => {
  const menuRef = useRef<{ [key: string]: Menu | null }>({});

  const newModel = menuModel.map((item, key) => {
    const newItem: MenuItem = { ...item };
    newItem.data = message;

    switch (newItem.id) {
      case 'edit':
        newItem.visible =
          !isAfter15min(message.datetime) && message.from_me && message.device_type === 'web';
        break;
      case 'delete':
        newItem.visible =
          !isAfter60Hour(message.datetime) && message.from_me && message.device_type === 'web';
        break;
      case 'download':
        newItem.visible = message.has_media;
        break;
      case 'option2':
        newItem.template = (item, options) => {
          return <>Teste </>;
        };
        break;
    }

    return newItem;
  });
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
