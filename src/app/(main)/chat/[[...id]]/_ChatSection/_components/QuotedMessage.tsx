import { useChatStore } from '@/store/useChatStore';
import Interweave from '@/components/Interweave';
import { fixHeartEmoji } from '@/service/Util';
import { ModeQuoted } from '@/Interfaces';

export default function QuotedMessage() {
  const quoted = useChatStore((s) => s.quoted);
  const setQuotedMessage = useChatStore((s) => s.setQuotedMessage);
  const activeChat = useChatStore((s) => s.activeChat);
  return (
    <>
      {quoted?.message && quoted.mode === ModeQuoted.REPLY && (
        <div className="fadeindown border-left-3 relative bg-gray-200 border-round-lg border-gray-500 p-2 overflow-hidden my-2">
          <p className={`font-bold ${quoted.message.from_me ? 'text-blue-600' : 'text-green-600'}`}>
            {quoted.message.from_me ? 'Você' : activeChat?.contact?.name}
          </p>
          <span className="text-clamp">
            {<Interweave content={fixHeartEmoji(quoted?.message?.content)} />}
          </span>
          <button
            onClick={() => setQuotedMessage(null, null)}
            type="button"
            className="absolute hover:border-gray-400 border-transparent hover:bg-gray-300 p-1 bg-transparent border-1 border-round-lg text-gray-700 cursor-pointer"
            style={{ right: '0.5rem', top: '.25rem' }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}
    </>
  );
}
