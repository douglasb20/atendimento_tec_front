import React, { memo, useMemo } from 'react';
import { isEqual, parseISO, startOfDay } from 'date-fns';
import { Image } from 'primereact/image';
import { ProgressSpinner } from 'primereact/progressspinner';
import { classNames } from 'primereact/utils';

import Interweave from '@/components/Interweave';
import { SupportChatMessageResponse, SupportChatsResponse } from '@/Interfaces';
import { DateToBR, fixHeartEmoji } from '@/service/Util';
import { useChatStore } from '@/store/useChatStore';
import QuotedMessageItem from './QuotedMessageItem';

type SingleMessageComponentProps = {
  message: SupportChatMessageResponse;
  doAnimation: boolean;
  isLast: boolean;
  activeChat: SupportChatsResponse;
  /** Mensagem citada, já resolvida pela lista - evita buscá-la aqui. */
  quotedMessage?: SupportChatMessageResponse;
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

/** Ícone por extensão - dá ao anexo a mesma pista visual do explorador. */
const iconeDocumento = (fileName?: string) => {
  const ext = fileName?.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'pdf') return 'fa-regular fa-file-pdf';
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) return 'fa-regular fa-file-word';
  if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) return 'fa-regular fa-file-excel';
  if (['ppt', 'pptx', 'odp'].includes(ext)) return 'fa-regular fa-file-powerpoint';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'fa-regular fa-file-zipper';
  if (['txt', 'log', 'md'].includes(ext)) return 'fa-regular fa-file-lines';
  if (['json', 'xml', 'html', 'ts', 'js', 'sql'].includes(ext)) return 'fa-regular fa-file-code';

  return 'fa-regular fa-file';
};

/** Tamanho legível; `null` é comum em mensagem que o provider não informou. */
const formataTamanhoArquivo = (bytes?: number | null) => {
  if (!bytes) return 'Documento';
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/**
 * Cobre a mídia com o progresso enquanto o arquivo sobe.
 *
 * Declarado fora do componente de propósito: definido dentro, o React o trata
 * como um tipo novo a cada render e desmonta a árvore - o vídeo piscava e o
 * quadro reajustava a cada porcentagem.
 */
const ComProgresso = ({
  progresso,
  children,
}: {
  progresso?: number;
  children: React.ReactNode;
}) => {
  if (progresso === undefined) return <>{children}</>;

  return (
    <div className="relative">
      {children}
      <div
        className="absolute top-0 left-0 w-full h-full flex flex-column align-items-center justify-content-center gap-2 border-round"
        style={{ background: 'rgba(0,0,0,.45)' }}
      >
        <ProgressSpinner
          className="w-3rem h-3rem"
          strokeWidth="4"
        />
        {/* Passado o upload, o arquivo ainda percorre provider e WhatsApp:
            manter "100%" daria a impressão de travado. */}
        <span className="text-white text-sm font-medium">
          {progresso < 100 ? `${progresso}%` : 'Finalizando'}
        </span>
      </div>
    </div>
  );
};

const SingleMessageComponent = ({
  message,
  doAnimation,
  isLast,
  activeChat,
  quotedMessage,
}: SingleMessageComponentProps) => {
  const { from_me, content } = message;
  // Só a ação, nunca a lista: assinar `messages` aqui faria cada bolha
  // re-renderizar a cada mensagem nova da conversa.
  const setVideoPreview = useChatStore((s) => s.setVideoPreview);

  const InterpretedContent = useMemo(() => fixHeartEmoji(content), [content]);

  const DivWithEmoji = () => (
    <div>
      <Interweave
        // style={{ overflowWrap: 'anywhere' }}
        content={fixHeartEmoji(InterpretedContent)}
      />
    </div>
  );

  // Item da fila ainda sem prévia tem `media_url` vazio; renderizar o player
  // com src="" faz o navegador recarregar a página inteira.
  const exibeMidia = message.has_media && !message.media_expired && Boolean(message.media_url);

  const enviandoMidia = message.progresso !== undefined;

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
      {message.is_deleted ? (
        // Revogada pelo autor: o conteúdo não existe mais, então nada do corpo
        // original é exibido - só o aviso, como no WhatsApp.
        <div className="flex align-items-center gap-2 font-italic opacity-80">
          <i className="fa-regular fa-ban" />
          <span>Mensagem apagada</span>
        </div>
      ) : (
        <>
          {message.has_quoted && (
            <QuotedMessageItem
              activeChat={activeChat}
              quoted={quotedMessage}
            />
          )}
          <div className="flex flex-column text-base ">
            {/* Expirada pela retenção: o arquivo saiu do storage, mas a
                mensagem e a legenda continuam no histórico. */}
            {message.has_media && message.media_expired && (
              <div
                className={classNames(
                  from_me ? 'bg-primary-600' : 'surface-200',
                  'flex align-items-center gap-2 border-round p-3 mb-2 text-sm',
                )}
              >
                <i className="fa-regular fa-clock-rotate-left" />
                <span>Mídia expirada</span>
              </div>
            )}
            {/* Mídia sem URL utilizável: item da fila retomado do armazenamento
                local, cujo `blob:` de prévia não sobrevive ao recarregar. */}
            {message.has_media && !message.media_expired && !message.media_url && (
              <div
                className={classNames(
                  from_me ? 'bg-primary-600' : 'surface-200',
                  'flex align-items-center gap-2 border-round p-3 mb-2 text-sm',
                )}
              >
                <i className="fa-regular fa-paperclip" />
                <span>{message.file_name ?? 'Arquivo'}</span>
              </div>
            )}
            {exibeMidia && message.type === 'document' && (
              <ComProgresso progresso={message.progresso}>
                <a
                  href={message.media_url}
                  target="_blank"
                  rel="noreferrer"
                  download={message.file_name ?? undefined}
                  className={classNames(
                    from_me ? 'bg-primary-600 text-white' : 'surface-200 text-color',
                    'flex align-items-center gap-3 border-round p-3 mb-2 no-underline',
                  )}
                  style={{ maxWidth: 250 }}
                >
                  <i className={classNames(iconeDocumento(message.file_name), 'text-3xl')} />
                  <div className="flex flex-column overflow-hidden">
                    <span
                      className="text-sm font-medium white-space-nowrap overflow-hidden text-overflow-ellipsis"
                      title={message.file_name ?? 'Documento'}
                    >
                      {message.file_name ?? 'Documento'}
                    </span>
                    <span className="text-xs opacity-80">
                      {formataTamanhoArquivo(message.media_size)}
                    </span>
                  </div>
                </a>
              </ComProgresso>
            )}
            {exibeMidia && message.type === 'document' && DivWithEmoji()}
            {exibeMidia && message.type === 'image' && (
              <ComProgresso progresso={message.progresso}>
                <Image
                  // A `key` amarrada à URL é necessária: o `Image` guarda o src
                  // em estado interno para o modo `preview`, e ao trocar a
                  // prévia local (`blob:`) pela URL do storage o React
                  // reaproveita a instância - que segue apontando para um blob
                  // já revogado, exibindo o ícone de imagem quebrada.
                  key={message.media_url}
                  src={message.media_url}
                  alt={message.file_name ?? 'Imagem'}
                  className="mb-2 border-round shadow-2"
                  imageStyle={{ maxWidth: '250px', height: '250px', objectFit: 'cover' }}
                  preview
                  downloadable
                />
              </ComProgresso>
            )}
            {exibeMidia && message.type === 'image' && DivWithEmoji()}
            {/* Voz gravada (`ptt`) e arquivo de áudio anexado (`audio`) tocam do
                mesmo jeito; o que muda é a origem, e o nome só existe no
                segundo caso. */}
            {exibeMidia && (message.type === 'ptt' || message.type === 'audio') && (
              <ComProgresso progresso={message.progresso}>
                <div className="mb-2 flex flex-column gap-1">
                  {message.type === 'audio' && message.file_name && (
                    <span
                      className="text-sm font-medium white-space-nowrap overflow-hidden text-overflow-ellipsis"
                      title={message.file_name}
                    >
                      <i className="fa-regular fa-music mr-2" />
                      {message.file_name}
                    </span>
                  )}
                  <audio
                    // Sem a `key`, trocar a prévia local pela URL do storage
                    // manteria o elemento preso ao blob já revogado.
                    key={message.media_url}
                    controls
                    // Largura fixa: com `100%` o player se ajustava à bolha, e
                    // num áudio curto sem legenda ela é estreita - os controles
                    // colapsavam num oval sem barra de progresso.
                    style={{ width: 350, maxWidth: '100%' }}
                  >
                    <source
                      src={message.media_url}
                      type={message.media_type}
                    />
                    Seu navegador não suporta o elemento de áudio.
                  </audio>
                </div>
              </ComProgresso>
            )}
            {exibeMidia && message.type === 'audio' && DivWithEmoji()}
            {exibeMidia && message.type === 'video' && (
              <ComProgresso progresso={message.progresso}>
                <div
                  className="mb-2 relative "
                  style={{ maxWidth: 250, maxHeight: 370, borderRadius: 8, overflow: 'hidden' }}
                >
                  <video
                    // Mesmo motivo do `Image`: trocar o src de um <source> não
                    // recarrega o vídeo (exigiria `load()`), então a instância
                    // seguiria presa ao blob revogado da prévia local.
                    key={message.media_url}
                    controls={false}
                    className="w-full h-full pointer-events-none "
                    autoPlay={message.is_gif}
                    loop={message.is_gif}
                    muted={message.is_gif}
                    playsInline
                    style={{
                      objectFit: 'fill',
                    }}
                  >
                    <source
                      src={message.media_url}
                      type={message.media_type}
                    />
                    Seu navegador não suporta o elemento de vídeo.
                  </video>
                  {!message.is_gif && !enviandoMidia && (
                    <div
                      className="button-play absolute top-0 left-0 w-full h-full flex align-items-center justify-content-center "
                      onClick={() => setVideoPreview(message.media_url, message.media_type)}
                    >
                      <button
                        className="border-none bg-transparent border-circle h-5rem w-5rem flex align-items-center justify-content-center"
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="fa-light fa-circle-play text-6xl text-white"></i>
                      </button>
                    </div>
                  )}
                </div>
              </ComProgresso>
            )}
            {exibeMidia && message.type === 'video' && DivWithEmoji()}
            {!exibeMidia && DivWithEmoji()}
          </div>
        </>
      )}
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

/**
 * Memoizado: numa conversa longa, cada evento re-renderizaria todas as bolhas.
 * Só refaz quando a própria mensagem (ou sua citada) muda.
 */
export default memo(SingleMessageComponent);
