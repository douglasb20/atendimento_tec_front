import { memo } from 'react';
import Interweave from '@/components/Interweave';
import { fixHeartEmoji } from '@/service/Util';
import { SupportChatMessageResponse, SupportChatsResponse } from '@/Interfaces';

function QuotedMessageItem({ quoted, activeChat }: { quoted: SupportChatMessageResponse, activeChat: SupportChatsResponse }) {
  return (
    <>
      <div
        onClick={() => { 
          document.getElementById(`${quoted.message_id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
        className="cursor-pointer relative bg-primary-800 border-round-lg border-left-3 border-green-600 p-2 overflow-hidden mb-1 select-none"
      >
        <p className={`font-bold ${quoted.from_me ? 'text-blue-600' : 'text-green-600'}`}>
          {quoted.from_me ? 'Você' : activeChat?.contact?.name}
        </p>
        <span className="text-clamp text-white">
          {<Interweave content={fixHeartEmoji(quoted?.content)} />}
        </span>
      </div>
    </>
  );
}

/** Memoizado: é renderizado uma vez por mensagem da conversa. */
export default memo(QuotedMessageItem);
