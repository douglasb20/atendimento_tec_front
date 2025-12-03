import { SupportChatMessageResponse, SupportChatsResponse } from '@/Interfaces';
import { Image } from 'primereact/image';

type ShowAvatarComponentProps = {
  message: SupportChatMessageResponse;
  activeChat: SupportChatsResponse;
};

const ShowAvatarComponent = ({ message, activeChat }: ShowAvatarComponentProps) => {
  let avatarUrl = '/images/avatar/avatar-noprofile.png';

  if (message.from_me && activeChat?.user?.avatar_url) {
    avatarUrl = activeChat.user.avatar_url;
  } else if (!message.from_me && activeChat?.contact?.avatar_url) {
    avatarUrl = activeChat.contact.avatar_url;
  }
  return (
    <div className="mx-2 overflow-hidden flex flex-none justify-content-center align-items-center">
      <Image
        src={avatarUrl}
        alt="Avatar"
        imageClassName="w-4rem h-4rem border-circle"
        imageStyle={{ objectFit: 'cover' }}
      />
    </div>
  );
};

export default ShowAvatarComponent;
