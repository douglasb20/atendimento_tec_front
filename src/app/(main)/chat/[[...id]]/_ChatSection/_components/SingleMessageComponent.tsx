import { useMemo } from 'react';
import { isEqual, parseISO, startOfDay } from 'date-fns';
import { Image } from 'primereact/image';
import { classNames } from 'primereact/utils';

import Interweave from '@/components/Interweave';
import { SupportChatMessageResponse } from '@/Interfaces';
import { DateToBR, fixHeartEmoji } from '@/service/Util';

type SingleMessageComponentProps = {
  message: SupportChatMessageResponse;
  doAnimation: boolean;
  isLast: boolean;
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

const SingleMessageComponent = ({ message, doAnimation, isLast }: SingleMessageComponentProps) => {
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
};

export default SingleMessageComponent;
