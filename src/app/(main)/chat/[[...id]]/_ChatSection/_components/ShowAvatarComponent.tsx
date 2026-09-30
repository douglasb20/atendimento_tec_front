import { memo } from 'react';
import { SupportChatMessageResponse, SupportChatsResponse } from '@/Interfaces';
import Avatar from '@/components/Avatar';

type ShowAvatarComponentProps = {
  message: SupportChatMessageResponse;
  activeChat: SupportChatsResponse;
};

const ShowAvatarComponent = ({ message, activeChat }: ShowAvatarComponentProps) => {
  // Mensagem automática não tem atendente por trás - mostrar o avatar de quem
  // está atendendo a conversa atribuiria a ele algo que o sistema mandou
  // sozinho (saudação, despedida, aviso de inatividade).
  if (message.is_automatic) {
    return (
      <div
        className="mx-2 flex-none flex justify-content-center align-items-center border-circle surface-200"
        style={{ width: 40, height: 40 }}
        title="Mensagem automática do sistema"
      >
        <i className="pi pi-cog text-primary" style={{ fontSize: '1.1rem' }} />
      </div>
    );
  }

  // `undefined` em vez do caminho padrão: o `Avatar` já resolve a ausência, e
  // deixar isso com ele é o que garante o mesmo desfecho quando a URL existe
  // mas falha ao carregar - o caso comum, já que a foto vem do WhatsApp com
  // assinatura de validade.
  const avatarUrl = message.from_me
    ? activeChat?.user?.avatar_url
    : activeChat?.contact?.avatar_url;

  return (
    <div className="mx-2 overflow-hidden flex flex-none justify-content-center align-items-center">
      <Avatar
        src={avatarUrl}
        alt="Avatar"
        width={40}
        height={40}
        className="border-circle"
        style={{ objectFit: 'cover' }}
      />
    </div>
  );
};

/** Memoizado: é renderizado uma vez por mensagem da conversa. */
export default memo(ShowAvatarComponent);
