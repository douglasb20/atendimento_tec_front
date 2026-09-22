import { memo } from 'react';
import Interweave from '@/components/Interweave';
import { descreveMidia, fixHeartEmoji, nomeCompleto } from '@/service/Util';
import { SupportChatMessageResponse, SupportChatsResponse } from '@/Interfaces';

function QuotedMessageItem({
  quoted,
  activeChat,
}: {
  quoted: SupportChatMessageResponse;
  activeChat: SupportChatsResponse;
}) {
  const midia = quoted.has_media ? descreveMidia(quoted.type, quoted.file_name) : null;

  const miniatura =
    midia && !quoted.media_expired && ['image', 'video', 'sticker'].includes(quoted.type)
      ? quoted.media_url
      : null;

  return (
    <>
      <div
        onClick={() => {
          document
            .getElementById(`${quoted.message_id}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
        className="cursor-pointer relative bg-primary-800 border-round-lg border-left-3 border-green-600 p-2 overflow-hidden mb-1 select-none flex align-items-center gap-2"
      >
        <div className="flex-1 overflow-hidden">
          <p className={`font-bold ${quoted.from_me ? 'text-blue-600' : 'text-green-600'}`}>
            {quoted.from_me ? 'Você' : nomeCompleto(activeChat?.contact)}
          </p>

          {/* O mesmo tratamento da barra acima do input: mídia sem legenda
              tem `content` vazio e deixaria a citação em branco. */}
          {midia ? (
            <span className="flex align-items-center gap-2 text-clamp text-white">
              <i className={`${midia.icone} text-sm`} />
              {quoted.content ? (
                <Interweave content={fixHeartEmoji(quoted.content)} />
              ) : (
                <span>{midia.rotulo}</span>
              )}
            </span>
          ) : (
            <span className="text-clamp text-white">
              <Interweave content={fixHeartEmoji(quoted.content)} />
            </span>
          )}
        </div>

        {miniatura && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={miniatura}
            alt=""
            className="flex-none border-round"
            style={{ width: '2.5rem', height: '2.5rem', objectFit: 'cover' }}
          />
        )}
      </div>
    </>
  );
}

/** Memoizado: é renderizado uma vez por mensagem da conversa. */
export default memo(QuotedMessageItem);
