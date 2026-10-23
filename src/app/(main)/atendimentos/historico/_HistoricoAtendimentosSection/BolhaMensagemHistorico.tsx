'use client';

import { classNames } from 'primereact/utils';
import { Image } from 'primereact/image';

import { SupportChatMessageResponse } from '@/Interfaces';
import { useAjustesAtendimento } from '@/hooks/useAjustesAtendimento';
import { DateToBR } from '@/service/Util';
import PlayerAudio from '@/app/(main)/chat/[[...id]]/_ChatSection/_components/PlayerAudio';
import Interweave from '@/components/Interweave';

type Props = {
  message: SupportChatMessageResponse;
};

/** `15/10/2026 23:04` - a data completa, igual à tabela de Atendimentos. */
const dataHora = (valor: string) => DateToBR(valor, 'dd/MM/yyyy HH:mm');

/**
 * Bolha de mensagem só-leitura para o modal de Histórico.
 *
 * Versão enxuta de `SingleMessageComponent` (chat ao vivo): sem outbox,
 * animação de chegada, menu de ações, reações nem edição - aqui a conversa já
 * terminou, e o modal só mostra o que foi trocado. `PlayerAudio` é
 * reaproveitado inteiro, por ser standalone (só pede `url`/`mimetype`).
 */
const BolhaMensagemHistorico = ({ message }: Props) => {
  const { from_me, content, type, has_media, media_expired, media_url } = message;
  const { ajustes } = useAjustesAtendimento();

  const exibeMidia = has_media && !media_expired && Boolean(media_url);

  // Mesma lógica de `SingleMessageComponent` (chat ao vivo) - o histórico
  // tinha ficado para trás, mostrando o conteúdo original de uma mensagem
  // apagada mesmo com o ajuste global desligado.
  const apagadaComConteudo = message.is_deleted && ajustes.mostrar_conteudo_mensagem_apagada;
  const apagadaSemConteudo = message.is_deleted && !ajustes.mostrar_conteudo_mensagem_apagada;

  const messageClass =
    apagadaComConteudo || apagadaSemConteudo
      ? `${from_me ? 'align-self-end' : 'align-self-start'} border-red-400 ${from_me ? 'bg-primary-500 text-primary-contrast' : 'surface-200 text-color'}`
      : from_me
        ? 'align-self-end border-primary-300 bg-primary-500 text-primary-contrast'
        : 'align-self-start border-300 surface-200 text-color';

  const temAudio = exibeMidia && (type === 'ptt' || type === 'audio');

  return (
    <div
      className={classNames(`relative border-1 p-2 mb-1 border-round-lg ${messageClass}`)}
      style={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        maxWidth: '80%',
        // Sem `.w-auto`: o PrimeFlex marca a largura com `!important` e
        // vencia este `minWidth` inline mesmo sem a classe no className.
        //
        // O player tem `minWidth: 220` fixo internamente (onda + tempo +
        // botão de velocidade); sem o mesmo mínimo aqui, mais o padding
        // (`p-2`), a bolha ficava mais estreita que o próprio conteúdo e o
        // botão vazava pela borda.
        ...(temAudio && { minWidth: 'calc(220px + 1rem)' }),
      }}
    >
      {message.hidden_at ? (
        // Removida só do nosso lado ("apagar para mim") - mesmo texto do chat
        // ao vivo.
        <div className="flex align-items-center gap-2 font-italic opacity-80">
          <i className="fa-regular fa-eye-slash" />
          <span>Mensagem removida do sistema</span>
        </div>
      ) : apagadaSemConteudo ? (
        <div className="flex align-items-center gap-2 font-italic opacity-80">
          <i className="fa-regular fa-ban text-red-400" />
          <span>Mensagem apagada</span>
        </div>
      ) : (
        <div className="flex flex-column text-base">
          {has_media && media_expired && (
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

          {exibeMidia && type === 'image' && (
            <Image
              src={media_url}
              alt="Imagem"
              className="mb-2 border-round shadow-2"
              imageStyle={{ maxWidth: '250px', maxHeight: '250px', objectFit: 'cover' }}
              preview
            />
          )}

          {temAudio && (
            <div className="mb-1">
              <PlayerAudio
                url={media_url}
                mimetype={message.media_type}
                proprio={from_me}
              />
            </div>
          )}

          {exibeMidia && type === 'video' && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              controls
              className="mb-2 border-round"
              style={{ maxWidth: 250, maxHeight: 370 }}
            >
              <source
                src={media_url}
                type={message.media_type}
              />
              Seu navegador não suporta o elemento de vídeo.
            </video>
          )}

          {!exibeMidia && has_media && (
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

          {content && (
            <div>
              <Interweave content={content} />
            </div>
          )}
        </div>
      )}

      <div className="w-full text-right flex flex-wrap-nowrap align-items-end justify-content-end gap-1">
        {apagadaComConteudo && (
          <span className="white-space-nowrap">
            <i
              className="fa-regular fa-ban text-xs text-red-400"
              title="Mensagem apagada"
            />
          </span>
        )}
        <span className="text-xs white-space-nowrap opacity-80">{dataHora(message.datetime)}</span>
      </div>
    </div>
  );
};

export default BolhaMensagemHistorico;
