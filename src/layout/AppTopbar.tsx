import type { AppTopbarRef } from '@/types';
import { Badge } from 'primereact/badge';
import { Button } from 'primereact/button';
import { forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { OverlayPanel } from 'primereact/overlaypanel';
import { LayoutContext } from './context/layoutcontext';
import StatusCanais from './StatusCanais';
import { PrimeIcons } from 'primereact/api';
import useApi from '@/service/Api/ApiClient';
import { useAvisarEvento } from '@/hooks/useAvisarEvento';
import { useChatStore } from '@/store/useChatStore';

const AppTopbar = forwardRef<AppTopbarRef>((props, ref) => {
  const { onMenuToggle, showProfileSidebar } = useContext(LayoutContext);
  const menubuttonRef = useRef(null);
  const painelNotificacoes = useRef<OverlayPanel>(null);
  const { FetchReq } = useApi();
  const socket = useChatStore((s) => s.socket);
  const { avisar } = useAvisarEvento();
  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const naoLidas = notificacoes.filter((n) => !n.lida).length;
  const carregarNotificacoes = () => FetchReq<any[]>('ListarNotificacoes')
    .then((dados) => { setNotificacoes(dados ?? []); return dados ?? []; })
    .catch((erro) => { console.error('Falha ao carregar notificações', erro); return []; });
  useEffect(() => { carregarNotificacoes(); }, []);
  useEffect(() => {
    const aoReceber = (notificacao: any) => {
      carregarNotificacoes();
      avisar({
        preferencia: 'notif_compromisso',
        titulo: notificacao?.titulo ?? 'Notificação',
        corpo: notificacao?.mensagem ?? '',
        tag: `notificacao-${notificacao?.id}`,
      });
    };
    socket?.on('notificacao:recebida', aoReceber);
    return () => { socket?.off('notificacao:recebida', aoReceber); };
  }, [socket, avisar]);
  const abrirNotificacoes = (evento: any) => {
    painelNotificacoes.current?.toggle(evento);
    // O evento do socket pode se perder (reconexão, token expirado) - recarregar
    // ao abrir garante que o sininho reflita o estado real do backend.
    carregarNotificacoes();
  };
  const marcarComoLida = (item: any) => {
    if (item.lida) return;
    setNotificacoes((lista) => lista.map((n) => (n.id === item.id ? { ...n, lida: true } : n)));
    FetchReq({ endpoint: 'LerNotificacao', variables: [item.id] }).catch((erro) => console.error('Falha ao marcar notificação como lida', erro));
  };


  useImperativeHandle(ref, () => ({
    menubutton: menubuttonRef.current,
  }));

  return (
    <div className="layout-topbar">
      <div className="topbar-start">
        <button
          ref={menubuttonRef}
          type="button"
          className="topbar-menubutton p-link p-trigger"
          onClick={onMenuToggle}
        >
          <i className="pi pi-bars"></i>
        </button>
      </div>

      <div className="topbar-end">
        <StatusCanais />

        <ul className="topbar-menu">
          <li className="relative">
            <Button icon="pi pi-bell text-2xl" text rounded aria-label="Notificações" onClick={abrirNotificacoes} />
            {naoLidas > 0 && (
              <Badge
                value={naoLidas}
                severity="danger"
                className="absolute flex align-items-center justify-content-center"
                style={{ top: '.35rem', right: '.15rem', minWidth: '1.2rem', height: '1.2rem', fontSize: '.75rem' }}
              />
            )}
            <OverlayPanel ref={painelNotificacoes} style={{ width: 'min(92vw, 24rem)' }} pt={{ content: { style: { padding: 0 } } }}>
              <div className="flex align-items-center justify-content-between px-3 py-3 border-bottom-1 surface-border">
                <span className="font-semibold">Notificações</span>
                {naoLidas > 0 && <span className="text-sm text-color-secondary">{naoLidas} não lida{naoLidas > 1 ? 's' : ''}</span>}
              </div>
              <div style={{ maxHeight: '24rem', overflowY: 'auto' }}>
                {notificacoes.length ? notificacoes.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => marcarComoLida(item)}
                    className="flex align-items-center gap-3 px-3 py-3 border-bottom-1 surface-border cursor-pointer transition-colors transition-duration-150 hover:surface-hover"
                    style={item.lida ? undefined : { background: 'color-mix(in srgb, var(--primary-color) 12%, transparent)', borderLeft: '3px solid var(--primary-color)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`white-space-nowrap overflow-hidden text-overflow-ellipsis ${item.lida ? 'font-normal' : 'font-semibold'}`}>
                        {item.notificacao?.titulo}
                      </div>
                      <div className="text-sm text-color-secondary line-height-3 mt-1 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {item.notificacao?.mensagem}
                      </div>
                    </div>
                    <span
                      className="border-circle flex-shrink-0"
                      style={{ width: '.5rem', height: '.5rem', background: item.lida ? 'transparent' : 'var(--primary-color)' }}
                    />
                  </div>
                )) : (
                  <div className="flex flex-column align-items-center gap-2 py-6 text-color-secondary">
                    <i className="pi pi-bell text-3xl" />
                    <small>Nenhuma notificação.</small>
                  </div>
                )}
              </div>
            </OverlayPanel>
          </li>
          <li className="topbar-profile">
            <Button
              icon={PrimeIcons.BARS}
              text
              rounded
              onClick={showProfileSidebar}
            />
          </li>
        </ul>
      </div>
    </div>
  );
});

AppTopbar.displayName = 'AppTopbar';

export default AppTopbar;
