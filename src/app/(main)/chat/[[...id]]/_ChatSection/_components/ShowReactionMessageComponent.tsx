import { memo } from 'react';
import { SupportChatMessageResponse } from '@/Interfaces';
import { classNames } from 'primereact/utils';

const ShowReactionMessageComponent = ({ message }: { message: SupportChatMessageResponse }) => {
  return (
    message.has_reaction && (
      <span
        className={classNames(
          { 'bg-primary-300 border-primary-400 right-0': message.from_me },
          { 'bg-gray-300 border-gray-400 left-0': !message.from_me },
          'absolute bottom-0 text-lg border-circle rounded-full border-1 flex justify-content-center align-items-center',
        )}
        style={{
          transform: message.from_me ? 'translate(25%, 45%)' : 'translate(-25%, 45%)',
          width: '2rem',
          height: '2rem',
        }}
      >
        {message.reaction}
      </span>
    )
  );
};

/** Memoizado: é renderizado uma vez por mensagem da conversa. */
export default memo(ShowReactionMessageComponent);
