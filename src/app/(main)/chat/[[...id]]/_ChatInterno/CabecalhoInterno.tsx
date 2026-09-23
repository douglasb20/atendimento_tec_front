'use client';

import Avatar from '@/components/Avatar';
import { ColegaResponse } from '@/Interfaces';
import { useChatInternoStore } from '@/store/useChatInternoStore';
import BolinhaPresenca from './BolinhaPresenca';

const nomeDe = (colega: ColegaResponse) =>
  [colega.name, colega.last_name].filter(Boolean).join(' ');

const ROTULO: Record<string, string> = {
  online: 'Disponível',
  ausente: 'Ausente',
  offline: 'Offline',
};

/**
 * Cabeçalho da conversa interna no painel.
 *
 * Fica ao lado da `JanelaInterna` em vez de dentro dela porque o popup traz o
 * seu próprio, com os controles de janela - os dois cabeçalhos mostram a mesma
 * pessoa, mas com ações diferentes.
 */
const CabecalhoInterno = () => {
  const ativo = useChatInternoStore((s) => s.ativo);
  const presencas = useChatInternoStore((s) => s.presencas);
  const destacar = useChatInternoStore((s) => s.destacar);
  const fechar = useChatInternoStore((s) => s.fechar);

  if (!ativo) return null;

  const estado = presencas[ativo.id] ?? 'offline';

  return (
    <div className="flex align-items-center gap-2 surface-100 border-bottom-1 surface-border px-3 py-2">
      <div className="relative flex-shrink-0">
        <Avatar
          src={ativo.avatar_url}
          alt={nomeDe(ativo)}
          width={38}
          height={38}
          className="border-circle"
          style={{ objectFit: 'cover' }}
        />
        <BolinhaPresenca
          estado={estado}
          tamanho={0.65}
          corDaBorda="var(--surface-100)"
        />
      </div>

      <div className="flex flex-column flex-1 min-w-0">
        <span className="font-medium white-space-nowrap overflow-hidden text-overflow-ellipsis">
          {nomeDe(ativo)}
        </span>
        <span className="text-xs text-500">{ROTULO[estado]}</span>
      </div>

      <button
        type="button"
        title="Abrir em janela flutuante"
        onClick={() => destacar()}
        className="border-none bg-transparent surface-hover text-600 cursor-pointer border-circle flex align-items-center justify-content-center flex-shrink-0"
        style={{ width: '2.25rem', height: '2.25rem', lineHeight: 1 }}
      >
        <i className="fa-regular fa-arrow-up-right-from-square" />
      </button>

      <button
        type="button"
        title="Fechar conversa"
        onClick={fechar}
        className="border-none bg-transparent surface-hover text-600 cursor-pointer border-circle flex align-items-center justify-content-center flex-shrink-0"
        style={{ width: '2.25rem', height: '2.25rem', lineHeight: 1 }}
      >
        <i className="fa-regular fa-xmark" />
      </button>
    </div>
  );
};

export default CabecalhoInterno;
