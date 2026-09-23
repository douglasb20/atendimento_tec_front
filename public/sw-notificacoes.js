/**
 * Service worker mínimo, só para exibir notificações.
 *
 * ⚠️ **Não é push.** Não há `push` listener nem chaves VAPID: ele existe porque
 * vários navegadores baseados em Chromium recusam o construtor
 * `new Notification(...)` fora de um service worker - lançam `Illegal
 * constructor` ou simplesmente não mostram nada. `registration.showNotification`
 * funciona nos dois casos.
 *
 * Como não há push, ele só age com o portal aberto em alguma aba.
 */

// Assume o controle sem esperar um reload - sem isto, a primeira visita
// registraria o worker mas ele só passaria a valer na próxima.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()));

/**
 * Clicar na notificação traz a aba do portal para a frente.
 *
 * Abrir uma aba nova seria pior: a pessoa já tem o sistema aberto, e teria duas
 * sessões olhando a mesma conversa.
 */
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();

  const destino = evento.notification.data?.url;

  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if ('focus' in janela) {
          // A aba avisa o app, que decide o que abrir - o worker não conhece
          // as rotas nem o estado da tela.
          janela.postMessage({ tipo: 'notificacao-clicada', url: destino });
          return janela.focus();
        }
      }

      // Nenhuma aba aberta: abre o portal.
      if (self.clients.openWindow) return self.clients.openWindow(destino || '/chat');
    }),
  );
});
