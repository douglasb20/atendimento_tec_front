import { resumoDoContato } from '@/service/Vcard';
import { useChatStore } from '@/store/useChatStore';
import Interweave from '@/components/Interweave';
import { descreveMidia, fixHeartEmoji, nomeCompleto } from '@/service/Util';
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
        <div className="resposta-selecionada fadeindown">
          <div className="resposta-selecionada-corpo">
            <p className="resposta-selecionada-autor">
              {mensagem.from_me ? 'Você' : nomeCompleto(activeChat?.contact)}
            </p>

            {/* Mídia sem legenda tem `content` vazio: sem o rótulo, a faixa
                aparecia em branco e não dizia a que se responde. Com legenda,
                ela é o texto, e o rótulo fica ao lado - como no WhatsApp. */}
            {midia ? (
              <span className="resposta-selecionada-conteudo flex align-items-center gap-2 text-clamp">
                <i className={`${midia.icone} text-sm`} />
                {mensagem.content ? (
                  <Interweave content={fixHeartEmoji(mensagem.content)} />
                ) : (
                  <span>{midia.rotulo}</span>
                )}
              </span>
            ) : resumoDoContato(mensagem.type, mensagem.content) ? (
              <span className="resposta-selecionada-conteudo flex align-items-center gap-2 text-clamp">
                <i className="fa-regular fa-address-card text-sm" />
                {resumoDoContato(mensagem.type, mensagem.content)}
              </span>
            ) : (
              <span className="resposta-selecionada-conteudo text-clamp">
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
            className="resposta-selecionada-fechar"
            aria-label="Cancelar resposta"
            title="Cancelar resposta"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}
    </>
  );
}
