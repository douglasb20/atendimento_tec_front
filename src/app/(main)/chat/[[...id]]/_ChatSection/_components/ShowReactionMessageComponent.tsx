import { classNames } from 'primereact/utils';
import { memo } from 'react';

import { SupportChatMessageResponse } from '@/Interfaces';

/**
 * Agrupa as reações por emoji, preservando a ordem em que apareceram.
 *
 * O banco guarda um emoji por pessoa (`{ jid: emoji }`); na bolha o que importa
 * é quantos reagiram com cada um - duas pessoas com 👍 viram um só, com "2".
 */
const agrupaPorEmoji = (reacoes: Record<string, string>) => {
  const contagem = new Map<string, number>();

  for (const emoji of Object.values(reacoes ?? {})) {
    if (emoji) contagem.set(emoji, (contagem.get(emoji) ?? 0) + 1);
  }

  return Array.from(contagem.entries());
};

const ShowReactionMessageComponent = ({ message }: { message: SupportChatMessageResponse }) => {
  const grupos = agrupaPorEmoji(message.reaction);

  if (!message.has_reaction || grupos.length === 0) return null;

  const totalPessoas = Object.keys(message.reaction ?? {}).length;

  return (
    <span
      className={classNames(
        { 'bg-primary-300 border-primary-400 right-0': message.from_me },
        { 'bg-gray-300 border-gray-400 left-0': !message.from_me },
        'absolute bottom-0 border-round-3xl border-1 flex align-items-center gap-1 px-2',
      )}
      style={{
        transform: message.from_me ? 'translate(15%, 45%)' : 'translate(-15%, 45%)',
        height: '1.75rem',
      }}
      title={`${totalPessoas} ${totalPessoas === 1 ? 'reação' : 'reações'}`}
    >
      {grupos.map(([emoji, quantidade]) => (
        <span
          key={emoji}
          className="flex align-items-center gap-1 text-base line-height-1"
        >
          {emoji}
          {/* A contagem só aparece quando há mais de um: com uma pessoa, o "1"
              é ruído. */}
          {quantidade > 1 && <small className="text-xs font-medium">{quantidade}</small>}
        </span>
      ))}
    </span>
  );
};

/** Memoizado: é renderizado uma vez por mensagem da conversa. */
export default memo(ShowReactionMessageComponent);
