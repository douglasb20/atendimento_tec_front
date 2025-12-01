import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { classNames } from 'primereact/utils';
import { Image } from 'primereact/image';
import { isEqual, parseISO, startOfDay } from 'date-fns';
import { EmojiClickData, EmojiStyle, SkinTonePickerLocation, Theme } from 'emoji-picker-react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import ReactDOM from 'react-dom';

const EmojiPicker = dynamic(
  () => {
    return import('emoji-picker-react');
  },
  { ssr: false },
);

import Interweave from '@/components/Interweave';
import { SupportChatMessageResponse, SupportChatsResponse } from '@/Interfaces';
import { DateToBR, fixHeartEmoji } from '@/service/Util';
import { sendReactionMessage } from '@/actions/sendReactionMessage';

export function parseMensagem(texto: string): React.ReactNode[] {
  if (!texto) return [];

  // Divide o texto em partes mantendo as marcações
  const tokens = texto.split(/(\*[^*]+\*|_[^_]+_|~[^~]+~|`[^`]+`)/g);
  const elementos: React.ReactNode[] = [];

  tokens.forEach((token, i) => {
    if (!token) return;

    // 🟢 Negrito
    if (token.startsWith('*') && token.endsWith('*')) {
      const conteudo = token.slice(1, -1);
      elementos.push(<strong key={i}>{parseMensagem(conteudo)}</strong>);
    }
    // 🟣 Itálico
    else if (token.startsWith('_') && token.endsWith('_')) {
      const conteudo = token.slice(1, -1);
      elementos.push(<em key={i}>{parseMensagem(conteudo)}</em>);
    }
    // 🔴 Riscado
    else if (token.startsWith('~') && token.endsWith('~')) {
      const conteudo = token.slice(1, -1);
      elementos.push(<s key={i}>{parseMensagem(conteudo)}</s>);
    }
    // 🟠 Código
    else if (token.startsWith('`') && token.endsWith('`')) {
      const conteudo = token.slice(1, -1);
      elementos.push(
        <code
          key={i}
          className="bg-gray-200 px-1 rounded font-mono"
        >
          {conteudo}
        </code>,
      );
    }
    // Texto comum - preserva quebras de linha
    else {
      if (token.includes('\n')) {
        const linhas = token.split('\n');
        linhas.forEach((linha, lineIndex) => {
          elementos.push(<span key={`${i}-${lineIndex}`}>{linha}</span>);
          if (lineIndex < linhas.length - 1) {
            elementos.push(<br key={`${i}-br-${lineIndex}`} />);
          }
        });
      } else {
        // Envolver texto normal em span para preservar espaços
        elementos.push(<span key={i}>{token}</span>);
      }
    }
  });

  return elementos;
}

export function SingleMessage({
  message,
  doAnimation,
  isLast,
}: {
  message: SupportChatMessageResponse;
  doAnimation: boolean;
  isLast: boolean;
}) {
  const { from_me, content } = message;

  const InterpretedContent = useMemo(() => fixHeartEmoji(content), [content]);

  const DivWithEmoji = () => (
    <Interweave
      // style={{ overflowWrap: 'anywhere' }}
      content={fixHeartEmoji(InterpretedContent)}
    />
  );

  const messageClass = from_me
    ? 'align-self-end border-primary-300 bg-primary-500 text-white'
    : 'align-self-start border-gray-300 bg-gray-200 text-black';

  return (
    <div
      className={classNames(
        `relative animation-duration-200 w-auto border-1 p-2 mb-1 border-round-lg message-item-${from_me ? 'from-me' : 'from-them'} ${messageClass}`,
        {
          fadeinright: doAnimation && isLast && from_me,
          fadeinleft: doAnimation && isLast && !from_me,
        },
      )}
      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
    >
      <div className="flex flex-column text-base ">
        {message.has_media && message.type === 'image' && (
          <>
            <Image
              src={message.media_url}
              alt="Media"
              className="mb-2 border-round shadow-2"
              imageStyle={{ maxWidth: '500px', height: '500px', objectFit: 'cover' }}
              preview
              downloadable
            />
            {DivWithEmoji()}
          </>
        )}
        {message.has_media && message.type === 'ptt' && (
          <>
            <audio
              controls
              className="mb-2 "
              style={{ width: '35rem' }}
            >
              <source
                src={message.media_url}
                type={message.media_type}
              />
              Seu navegador não suporta o elemento de áudio.
            </audio>
          </>
        )}
        {message.has_media && message.type === 'video' && (
          <>
            <video
              controls={!message.is_gif}
              className="mb-2 inline-block"
              autoPlay={message.is_gif}
              loop={message.is_gif}
              muted={message.is_gif}
              style={{
                maxWidth: '40rem',
                height: !message.is_gif ? '50rem' : 'auto',
                objectFit: 'contain',
              }}
            >
              <source
                src={message.media_url}
                type={message.media_type}
              />
              Seu navegador não suporta o elemento de vídeo.
            </video>
            {DivWithEmoji()}
          </>
        )}
        {!message.has_media && DivWithEmoji()}
      </div>
      <div className="w-full text-right flex align-items-end justify-content-end gap-1 ">
        <span className="text-xs">{ArrumaData(message.datetime)}</span>
        {message.from_me && (
          <span>
            <i className={`fa ${ProccessAck(message.ack)} text-xs`}></i>
          </span>
        )}
      </div>
    </div>
  );
}

export const ShowReactionComponent = ({
  position,
  message,
  activeChat,
}: {
  position: 'left' | 'right';
  message: SupportChatMessageResponse;
  activeChat: SupportChatsResponse;
}) => {
  const [statusReaction, setStatusReaction] = useState(false);
  // Floating UI para posicionamento
  const { refs, floatingStyles } = useFloating({
    open: statusReaction,
    onOpenChange: setStatusReaction,
    placement: position === 'right' ? 'left-start' : 'right-start',
    middleware: [offset(8), flip(), shift({ padding: 10 })],
    whileElementsMounted: autoUpdate,
  });

  const handleReactionClick = async (emoji: EmojiClickData, api = null) => {
    try {
      setStatusReaction(false);

      const reaction = message.reaction === emoji.emoji ? '' : emoji.emoji;
      await sendReactionMessage(
        activeChat.id,
        reaction,
        message.message_id,
        activeChat.contact.remote_jid,
      );
    } catch (err) {
      console.log(err);
    }
  };

  // Clique fora do picker
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const refEl = refs.reference.current;
      const floatEl = refs.floating.current;
      if (
        statusReaction &&
        refEl instanceof HTMLElement &&
        floatEl instanceof HTMLElement &&
        !refEl.contains(e.target as Node) &&
        !floatEl.contains(e.target as Node)
      ) {
        setStatusReaction(false);
      }
    }

    if (statusReaction) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [statusReaction]);
  return (
    <>
      <button
        ref={refs.setReference}
        onClick={() => setStatusReaction(!statusReaction)}
        className={classNames(
          {
            hidden: statusReaction === false,
          },
          'box-reaction relative w-2rem h-2rem justify-content-center align-items-center border-1 align-self-center mx-1 bg-bluegray-400 border-bluegray-300 p-1 border-round-lg',
        )}
      >
        <i className="fa-regular text-lg fa-face-smile text-white"></i>
      </button>
      {/* PICKER - Renderizado via Portal (não é cortado no overflow!) */}
      {statusReaction &&
        ReactDOM.createPortal(
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              position: 'fixed',
              zIndex: 99999,
            }}
          >
            <EmojiPicker
              reactionsDefaultOpen={true}
              open={true}
              emojiStyle={EmojiStyle.APPLE}
              theme={Theme.DARK}
              skinTonePickerLocation={SkinTonePickerLocation.PREVIEW}
              emojiVersion="5.0"
              previewConfig={{ showPreview: false }}
              searchPlaceHolder="Pesquisar reação"
              onReactionClick={(emoji) => handleReactionClick(emoji)}
              onEmojiClick={(emoji, _, api) => handleReactionClick(emoji, api)}
              searchClearButtonLabel="Limpar"
            />
          </div>,
          document.body,
        )}
    </>
  );
};

const ArrumaData = (data: string) => {
  const hoje = startOfDay(new Date());
  const dataMsg = startOfDay(parseISO(data));

  if (isEqual(hoje, dataMsg)) {
    return DateToBR(data, 'HH:mm');
  } else {
    return DateToBR(data, 'dd/MM/yyyy HH:mm');
  }
};

const ProccessAck = (ack: number) => {
  switch (ack) {
    case 0:
      return 'fa-clock';
    case 1:
      return 'fa-check';
    case 2:
      return 'fa-check-double';
    case 3:
      return 'fa-check-double text-blue-500';
    default:
      return 'fa-clock';
  }
};
