'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Os três estados que o navegador reporta, mais o caso de não haver suporte. */
export type PermissaoNotificacao = 'default' | 'granted' | 'denied' | 'indisponivel';

export type PedidoNotificacao = {
  titulo: string;
  corpo: string;
  /** Para onde levar ao clicar. O worker só sabe navegar por URL. */
  url?: string;
  /** Avatar de quem mandou, quando houver. */
  icone?: string | null;
  /**
   * Agrupa notificações da mesma origem.
   *
   * Sem isso, dez mensagens do mesmo colega viram dez avisos empilhados. Com a
   * `tag`, a nova substitui a anterior.
   */
  tag?: string;
  /** O que fazer ao clicar - normalmente abrir a conversa. */
  aoClicar?: () => void;
};

/** O worker que exibe as notificações. Não faz push. */
const CAMINHO_SW = '/sw-notificacoes.js';

/**
 * Notificação do sistema operacional, pelo navegador.
 *
 * ⚠️ **Não é push.** Só funciona com o portal aberto em alguma aba, ainda que
 * em segundo plano. Push com o navegador fechado exigiria chaves VAPID e uma
 * tabela de assinaturas, e ficou fora de escopo.
 *
 * ⚠️ **Passa por um service worker, não por `new Notification(...)`.** Vários
 * navegadores baseados em Chromium recusam o construtor direto fora de um
 * worker - lançam `Illegal constructor`, ou pior, aceitam em silêncio e não
 * mostram nada. Foi exatamente o que aconteceu aqui: a decisão de notificar
 * estava certa, a chamada acontecia, e nenhum aviso aparecia. O construtor
 * segue como alternativa para quem não registrar o worker (Firefox, Safari).
 *
 * ⚠️ `Notification.requestPermission()` **precisa partir de um clique.** O
 * navegador ignora o pedido automático, e o sintoma é a permissão nunca sair de
 * `default`, sem erro. Por isso o pedido vive num botão, na aba Notificações.
 *
 * ⚠️ **Em `http://localhost`, o Opera não exibe o aviso enquanto uma aba da
 * mesma origem estiver visível.** O `onshow` dispara e nada aparece; mudando
 * para uma aba de outra origem, aparece. Em **HTTPS** (homologação) funciona
 * normalmente com a aba na frente - confirmado em 23/09/2026. Chrome e Firefox
 * não têm essa diferença.
 *
 * Ou seja: ao testar notificação no Opera, teste em homologação, não em
 * localhost. O comportamento local engana.
 */
export const useNotificacaoDispositivo = () => {
  const [permissao, setPermissao] = useState<PermissaoNotificacao>('default');
  const registroRef = useRef<ServiceWorkerRegistration | null>(null);

  // Lido depois da montagem: `Notification` não existe no servidor, e ler no
  // render quebraria a hidratação.
  //
  // ⚠️ Este estado serve **só para a tela** - mostrar o botão de permitir, o
  // aviso de bloqueado. Quem dispara **não pode** depender dele: é capturado na
  // montagem, e a permissão costuma ser concedida depois, no modal de Perfil.
  // Daí o `podeNotificarAgora()`, que lê o navegador na hora.
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermissao('indisponivel');
      return;
    }

    setPermissao(Notification.permission);
  }, []);

  /** Registra o worker uma vez e guarda o registro. */
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register(CAMINHO_SW)
      .then((registro) => {
        registroRef.current = registro;
      })
      .catch(() => {
        // Sem worker, cai no construtor direto. Em `http://` que não seja
        // localhost o registro é recusado, e é um caso legítimo.
      });
  }, []);

  /**
   * O clique numa notificação do worker.
   *
   * O worker não conhece as rotas nem o estado da tela, então manda a `url` por
   * `postMessage` e o app navega. Sem este ouvinte, clicar traria a aba para
   * frente e pararia por aí.
   */
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const aoReceber = (evento: MessageEvent) => {
      if (evento.data?.tipo !== 'notificacao-clicada') return;

      const url = evento.data?.url;

      // `replaceState` + evento, como o resto do chat faz: um `push` encheria o
      // histórico de voltas para conversas.
      if (url && typeof window !== 'undefined') window.location.assign(url);
    };

    navigator.serviceWorker.addEventListener('message', aoReceber);
    return () => navigator.serviceWorker.removeEventListener('message', aoReceber);
  }, []);

  /** A permissão **neste instante**, direto do navegador. */
  const podeNotificarAgora = useCallback((): boolean => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;

    return Notification.permission === 'granted';
  }, []);

  const pedirPermissao = useCallback(async (): Promise<PermissaoNotificacao> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'indisponivel';

    // Negada, o navegador **não pergunta de novo**: a chamada retorna na hora,
    // ainda como `denied`. Só o próprio usuário reverte, nas configurações do
    // site - e é o que a tela precisa explicar.
    const resposta = await Notification.requestPermission();

    setPermissao(resposta);
    return resposta;
  }, []);

  /**
   * Mostra a notificação, se houver permissão.
   *
   * Quem decide *se* o evento merece aviso é quem chama - aqui só o mecanismo.
   */
  const notificar = useCallback(
    async ({ titulo, corpo, icone, tag, url, aoClicar }: PedidoNotificacao) => {
      if (!podeNotificarAgora()) return;

      const opcoes = {
        body: corpo,
        icon: icone || '/images/logo.png',
        tag,
        // ⚠️ `renotify: true` **com** `tag`: a nova substitui a anterior (não
        // empilha dez avisos do mesmo colega) mas **alerta de novo** - popup e
        // som do sistema.
        //
        // Com `false`, a substituição é silenciosa: a segunda mensagem troca o
        // texto de uma notificação que já saiu da tela, e nada aparece. Numa
        // conversa com várias mensagens seguidas, o sintoma é não ver aviso
        // nenhum depois do primeiro.
        renotify: true,
        // Só o worker usa: ele devolve isto no clique, por `postMessage`.
        data: { url },
        // A notificação some sozinha depois de alguns segundos. Com a aba do
        // portal na frente é justamente quando ela passa despercebida - o
        // canto da tela é o único lugar onde ela aparece, e o olho está no
        // meio. `requireInteraction` a mantém até a pessoa fechar ou clicar.
        requireInteraction: true,
      } as NotificationOptions;

      /**
       * Caminho principal: o construtor.
       *
       * ⚠️ **Nesta ordem, e por medição.** Cheguei a pôr o service worker à
       * frente supondo que o construtor não funcionasse no Chromium - uma
       * página de diagnóstico mostrou o oposto no Opera: com a aba **em foco**,
       * o `showNotification` do worker cria a notificação (o navegador a lista
       * em `getNotifications()`) e **não a exibe**, enquanto o construtor
       * aparece normalmente.
       *
       * O worker continua abaixo porque é o que funciona onde o construtor é
       * recusado, e é ele que atende quando a aba está oculta.
       */
      try {
        const notificacao = new Notification(titulo, opcoes);

        notificacao.onclick = () => {
          // Traz a janela para frente antes de navegar: sem isso a conversa
          // abriria numa aba que continua atrás de tudo.
          window.focus();
          notificacao.close();
          aoClicar?.();
        };

        return;
      } catch {
        // Cai no worker abaixo.
      }

      // Alternativa: onde o construtor é recusado (alguns Chromium, Android), o
      // worker é o único caminho. `navigator.serviceWorker.ready` espera a
      // ativação - registrar não basta.
      try {
        const registro =
          registroRef.current ??
          ('serviceWorker' in navigator ? await navigator.serviceWorker.ready : null);

        if (registro) await registro.showNotification(titulo, opcoes);
      } catch (erro) {
        console.warn('Não foi possível exibir a notificação:', erro);
      }
    },
    [podeNotificarAgora],
  );

  return {
    permissao,
    /** Para a tela. Quem dispara usa `podeNotificarAgora()`. */
    permitida: permissao === 'granted',
    podeNotificarAgora,
    /** O navegador não suporta, ou a pessoa bloqueou - a tela explica cada caso. */
    bloqueada: permissao === 'denied',
    indisponivel: permissao === 'indisponivel',
    pedirPermissao,
    notificar,
  };
};
