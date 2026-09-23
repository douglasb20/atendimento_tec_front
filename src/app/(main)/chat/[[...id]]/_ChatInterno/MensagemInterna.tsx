'use client';

import { memo } from 'react';
import { classNames } from 'primereact/utils';

import { InternalMessageResponse, InternalMessageType } from '@/Interfaces';
import PlayerAudio from '../_ChatSection/_components/PlayerAudio';

/** `14:35` a partir do ISO. */
const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** `1,4 MB` - o tamanho cru não diz nada a quem lê. */
const tamanhoLegivel = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

type Props = {
  mensagem: InternalMessageResponse;
  /** Enviada por mim: muda o lado e a cor da bolha. */
  propria: boolean;
};

/**
 * Uma bolha do chat interno.
 *
 * ⚠️ Mídia expirada **não é** mensagem apagada: o arquivo foi removido pela
 * retenção e a mensagem continua válida. O aviso em itálico existe para essa
 * diferença ficar clara - sem ele pareceria que alguém removeu a mensagem.
 */
const MensagemInterna = ({ mensagem, propria }: Props) => {
  const conteudoDaMidia = () => {
    if (mensagem.media_expired || !mensagem.media_url) {
      return (
        <div className="flex align-items-center gap-2 text-sm font-italic opacity-70 py-2">
          <i className="fa-regular fa-clock-rotate-left" />
          <span>Arquivo expirado</span>
        </div>
      );
    }

    switch (mensagem.type) {
      case InternalMessageType.IMAGE:
        return (
          // `<img>` e não `next/image`: a URL vem do storage, e um host não
          // declarado em `next.config.js` faz o componente lançar no render.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mensagem.media_url}
            alt={mensagem.file_name ?? 'Imagem'}
            className="border-round cursor-pointer"
            style={{ maxWidth: '100%', maxHeight: '15rem', objectFit: 'cover' }}
            onClick={() => window.open(mensagem.media_url!, '_blank')}
          />
        );

      case InternalMessageType.VIDEO:
        return (
          <video
            src={mensagem.media_url}
            controls
            className="border-round"
            style={{ maxWidth: '100%', maxHeight: '15rem' }}
          />
        );

      case InternalMessageType.AUDIO:
      case InternalMessageType.VOICE:
        return (
          <PlayerAudio
            url={mensagem.media_url}
            mimetype={mensagem.media_type ?? undefined}
            proprio={propria}
          />
        );

      default:
        return (
          <a
            href={mensagem.media_url}
            target="_blank"
            rel="noreferrer"
            className={classNames(
              'flex align-items-center gap-2 no-underline p-2 border-round',
              propria ? 'text-white' : 'text-color',
            )}
            style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}
          >
            <i className="fa-regular fa-file text-xl" />
            <span className="flex flex-column">
              <span className="text-sm white-space-nowrap overflow-hidden text-overflow-ellipsis">
                {mensagem.file_name ?? 'Arquivo'}
              </span>
              {mensagem.media_size && (
                <span className="text-xs opacity-70">{tamanhoLegivel(mensagem.media_size)}</span>
              )}
            </span>
          </a>
        );
    }
  };

  return (
    <div className={classNames('flex mb-2', propria ? 'justify-content-end' : 'justify-content-start')}>
      <div
        className={classNames(
          'border-round-lg px-2 py-1 flex flex-column gap-1',
          propria ? 'text-white' : 'surface-100 text-color',
        )}
        style={{
          maxWidth: '75%',
          ...(propria && { backgroundColor: 'var(--primary-color)' }),
        }}
      >
        {mensagem.has_media && conteudoDaMidia()}

        {mensagem.content && (
          <span
            className="text-sm"
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {mensagem.content}
          </span>
        )}

        <div className="flex align-items-center gap-1 justify-content-end">
          <span
            className="text-xs opacity-70"
            style={{ lineHeight: 1 }}
          >
            {hora(mensagem.created_at)}
          </span>

          {/* Tique só nas próprias: saber se o outro leu o que eu escrevi. */}
          {propria && (
            <i
              className={classNames(
                'text-xs',
                mensagem.read_at ? 'fa-solid fa-check-double' : 'fa-solid fa-check',
              )}
              title={mensagem.read_at ? 'Lida' : 'Enviada'}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(MensagemInterna);
