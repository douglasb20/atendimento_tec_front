import { classNames } from 'primereact/utils';

import { SupportChatMessageResponse } from '@/Interfaces';
import { useChatStore } from '@/store/useChatStore';

type ShowReactionComponentProps = {
  message: SupportChatMessageResponse;
  bottomEl: HTMLDivElement | null;
};

const ShowReactionPickerComponent = ({ message, bottomEl }: ShowReactionComponentProps) => {
  const setReactionState = useChatStore((s) => s.setReactionState);
  const reactionState = useChatStore((s) => s.reactionState);

  const handleReactionState = (event: React.MouseEvent<HTMLButtonElement>) => {
    const isSameButton = reactionState.anchorEl === event.currentTarget;

    if (isSameButton) {
      bottomEl?.classList.remove('no-scroll');
      setReactionState({
        open: false,
        message: null,
        anchorEl: null,
      });
    } else {
      bottomEl?.classList.add('no-scroll');
      setReactionState({
        open: true,
        message,
        anchorEl: event.currentTarget,
      });
    }
  };

  // Revogada não tem a que reagir, e pendente ainda não existe no WhatsApp.
  if (message.is_deleted || message.pending) return null;

  return (
    <>
      <button
        onClick={handleReactionState}
        className={classNames(
          {
            hidden:
              !reactionState.open ||
              (reactionState.message && reactionState.message.id !== message.id),
          },
          'box-reaction absolute w-2rem h-2rem justify-content-center align-items-center border-1 align-self-center mx-1 bg-bluegray-400 border-bluegray-300 p-1 border-round-lg',
        )}
        style={message.from_me ? { left: '-2.5rem' } : { right: '-2.5rem' }}
      >
        <i className="fa-regular text-lg fa-face-smile text-white"></i>
      </button>
    </>
  );
};

export default ShowReactionPickerComponent;
