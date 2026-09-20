import { useChatStore } from '@/store/useChatStore';
import Interweave from '@/components/Interweave';
import { descreveMidia, fixHeartEmoji } from '@/service/Util';
import { ModeQuoted } from '@/Interfaces';

export default function QuotedMessage() {
  const quoted = useChatStore((s) => s.quoted);
  const setQuotedMessage = useChatStore((s) => s.setQuotedMessage);
  const activeChat = useChatStore((s) => s.activeChat);

  const mensagem = quoted?.message;
  const midia = mensagem?.has_media ? descreveMidia(mensagem.type, mensagem.file_name) : null;

  // A miniatura só vale para o que é visual: um documento ou um áudio não têm
  // o que mostrar, e a mídia expirada pela retenção não tem mais arquivo.
  const miniatura =
    midia &&
    !mensagem?.media_expired &&
    ['image', 'video', 'sticker'].includes(mensagem?.type) &&
    mensagem?.media_url
      ? mensagem.media_url
      : null;

  return (
    <>
      {mensagem && quoted.mode === ModeQuoted.REPLY && (
        <div className="fadeindown border-left-3 relative bg-gray-200 border-round-lg border-gray-500 p-2 overflow-hidden my-2 flex align-items-center gap-2">
          <div className="flex-1 overflow-hidden">
            <p className={`font-bold ${mensagem.from_me ? 'text-blue-600' : 'text-green-600'}`}>
              {mensagem.from_me ? 'Você' : activeChat?.contact?.name}
            </p>

            {/* Mídia sem legenda tem `content` vazio: sem o rótulo, a faixa
                aparecia em branco e não dizia a que se responde. Com legenda,
                ela é o texto, e o rótulo fica ao lado - como no WhatsApp. */}
            {midia ? (
              <span className="flex align-items-center gap-2 text-clamp text-700">
                <i className={`${midia.icone} text-sm`} />
                {mensagem.content ? (
                  <Interweave content={fixHeartEmoji(mensagem.content)} />
                ) : (
                  <span>{midia.rotulo}</span>
                )}
              </span>
            ) : (
              <span className="text-clamp">
                <Interweave content={fixHeartEmoji(mensagem.content)} />
              </span>
            )}
          </div>

          {miniatura && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={miniatura}
              alt=""
              className="flex-none border-round"
              style={{ width: '3rem', height: '3rem', objectFit: 'cover' }}
            />
          )}

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
