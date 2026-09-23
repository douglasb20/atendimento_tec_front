'use client';

import { Badge } from 'primereact/badge';
import { classNames } from 'primereact/utils';

export type AbaConversa = 'atendimentos' | 'interno';

type Props = {
  ativa: AbaConversa;
  onTrocar: (aba: AbaConversa) => void;
  /** Não lidas do chat interno - some quando é zero. */
  naoLidasInternas: number;
};

/**
 * Alterna a coluna esquerda entre os atendimentos e o chat interno.
 *
 * Duas abas no lugar de uma lista só: são coisas de natureza diferente -
 * atendimento tem protocolo, fila e dono, conversa com colega não tem nada
 * disso - e misturá-las na mesma lista faria o atendente perder um cliente
 * esperando no meio de conversa interna.
 */
const AbasConversa = ({ ativa, onTrocar, naoLidasInternas }: Props) => {
  const aba = (chave: AbaConversa, icone: string, rotulo: string, badge?: number) => (
    <button
      type="button"
      onClick={() => onTrocar(chave)}
      className={classNames(
        'flex-1 flex align-items-center justify-content-center gap-2 border-none cursor-pointer py-2 px-2 text-sm transition-colors transition-duration-150',
        ativa === chave
          ? 'surface-0 text-primary font-medium border-bottom-2 border-primary'
          : 'surface-100 text-600 border-bottom-2 border-transparent hover:surface-200',
      )}
    >
      <i className={icone} />
      <span className="white-space-nowrap">{rotulo}</span>

      {Boolean(badge) && (
        <Badge
          value={badge}
          severity="danger"
        />
      )}
    </button>
  );

  return (
    <div className="flex mb-2 border-round-top overflow-hidden">
      {aba('atendimentos', 'fa-regular fa-comments', 'Meus')}
      {aba('interno', 'fa-regular fa-users', 'Interno', naoLidasInternas)}
    </div>
  );
};

export default AbasConversa;
