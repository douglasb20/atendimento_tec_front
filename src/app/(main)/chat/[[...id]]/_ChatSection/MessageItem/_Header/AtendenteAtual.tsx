'use client';

import Avatar from '@/components/Avatar';
import { UserResponse } from '@/Interfaces/user.interface';
import { nomeCompleto } from '@/service/Util';

type AtendenteAtualProps = {
  atendente?: UserResponse;
};

/**
 * Quem está conduzindo o atendimento.
 *
 * Numa conversa que passa de mão em mão, o nome no cabeçalho é o que responde
 * "isto é meu?" sem precisar abrir o histórico - e depois de uma transferência
 * é a única confirmação visível de que ela aconteceu.
 *
 * Só o primeiro nome: o cabeçalho já disputa espaço com contato, protocolo e
 * cronômetro, e "Douglas" basta para identificar o colega. O nome inteiro fica
 * no `title`.
 */
const AtendenteAtual = ({ atendente }: AtendenteAtualProps) => {
  if (!atendente?.name) return null;

  // `name` já é o primeiro nome desde a separação das colunas - o `split` que
  // havia aqui virou redundante.
  const completo = nomeCompleto(atendente);

  return (
    <span
      className="flex align-items-center gap-2 white-space-nowrap"
      title={`Atendimento com ${completo}`}
    >
      <Avatar
        src={atendente.avatar_url}
        alt={completo}
        width={22}
        height={22}
        className="border-circle flex-none"
        style={{ objectFit: 'cover' }}
      />
      <span className="text-sm font-semibold text-700">{atendente.name}</span>
    </span>
  );
};

export default AtendenteAtual;
