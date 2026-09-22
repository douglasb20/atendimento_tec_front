'use client';

import { useRouter } from 'next/navigation';
import { Menu } from 'primereact/menu';
import { MenuItem } from 'primereact/menuitem';
import { classNames } from 'primereact/utils';
import { useRef } from 'react';

import { ChannelStatusId, useStatusCanais } from '@/hooks/useStatusCanais';

/** Cor da bolinha e do texto por status. */
const CORES: Record<number, { ponto: string; texto: string }> = {
  [ChannelStatusId.CONECTADO]: { ponto: 'bg-green-500', texto: 'text-green-600' },
  [ChannelStatusId.CONECTANDO]: { ponto: 'bg-yellow-500', texto: 'text-yellow-700' },
  [ChannelStatusId.DESCONECTADO]: { ponto: 'bg-red-500', texto: 'text-red-500' },
  [ChannelStatusId.SESSAO_EXPIRADA]: { ponto: 'bg-orange-500', texto: 'text-orange-600' },
};

const corDe = (statusId: number) => CORES[statusId] ?? { ponto: 'bg-400', texto: 'text-500' };

const Ponto = ({ statusId }: { statusId: number }) => (
  <span
    className={classNames('border-circle flex-shrink-0', corDe(statusId).ponto)}
    style={{ width: '0.5rem', height: '0.5rem' }}
  />
);

/**
 * Resumo do estado das conexões de WhatsApp, no topbar.
 *
 * Sem canal conectado nenhuma mensagem entra ou sai - é a informação que o
 * atendente precisa ver sem procurar. Escolher um canal abre a configuração
 * dele.
 *
 * Usa `Menu` popup + botão de toggle, o mesmo padrão do menu de ações do
 * atendimento (`_Header/AcoesAtendimento`).
 */
const StatusCanais = () => {
  const router = useRouter();
  const menuRef = useRef<Menu>(null);
  const { ativos, conectados, tudoConectado, carregando } = useStatusCanais();

  // Nada a mostrar enquanto carrega ou sem canal cadastrado - um badge vazio
  // só ocuparia espaço.
  if (carregando || ativos.length === 0) return null;

  const total = ativos.length;
  const algumConectando = ativos.some((c) => c.channel_status_id === ChannelStatusId.CONECTANDO);

  const statusResumo = tudoConectado
    ? ChannelStatusId.CONECTADO
    : algumConectando
      ? ChannelStatusId.CONECTANDO
      : ChannelStatusId.DESCONECTADO;

  const rotulo =
    total === 1
      ? (ativos[0].channelStatus?.name ?? 'Sem status')
      : tudoConectado
        ? `${total} canais conectados`
        : `${conectados} de ${total} conectados`;

  const itensMenu: MenuItem[] = ativos.map((canal) => ({
    label: canal.name,
    // O `icon` do MenuItem é só uma string de classe - as utilitárias de forma
    // e cor transformam o espaço do ícone na bolinha de status.
    icon: classNames('border-circle w-1rem h-1rem', corDe(canal.channel_status_id).ponto),
    // A configuração é um modal dentro de /canais, não uma rota própria; o
    // parâmetro diz à tela qual canal abrir ao montar.
    command: () => router.push(`/canais?canal=${canal.id}`),
  }));

  return (
    <>
      <Menu
        ref={menuRef}
        model={itensMenu}
        popupAlignment="right"
        popup
      />

      <button
        type="button"
        className="p-link flex align-items-center gap-2 px-2 py-1 border-round transition-colors transition-duration-150 hover:surface-hover"
        onClick={(evento) => menuRef.current?.toggle(evento)}
        aria-haspopup
        aria-label={`Conexões do WhatsApp: ${rotulo}`}
      >
        <Ponto statusId={statusResumo} />
        <span className={classNames('text-sm hidden md:inline', corDe(statusResumo).texto)}>
          {rotulo}
        </span>
      </button>
    </>
  );
};

export default StatusCanais;
