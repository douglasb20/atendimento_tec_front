'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';

import { ChavePreferenciaNotificacao } from '@/Interfaces';
import { useAlertasTelaStore } from '@/store/useAlertasTelaStore';
import { usePreferenciasStore } from '@/store/usePreferenciasStore';
import { useNotificacaoDispositivo } from './useNotificacaoDispositivo';

type Aviso = {
  /** Qual evento é este - cada um tem sua preferência. */
  preferencia: ChavePreferenciaNotificacao;
  titulo: string;
  corpo: string;
  icone?: string | null;
  tag?: string;
  /** Para onde o clique leva. O worker navega por URL. */
  url?: string;
  aoClicar?: () => void;
  /**
   * A conversa em questão está aberta na tela.
   *
   * Com o portal na frente, é o único caso de silêncio total: a bolha aparece
   * na hora, e qualquer aviso repetiria o que a pessoa acabou de ver. Quem
   * chama sabe disso; o hook não tem como saber.
   */
  conversaAberta?: boolean;
};

/**
 * O som pode tocar?
 *
 * Fora do hook porque o som é tocado em dois pontos que não passam por
 * `avisar` (o `chat_state` do atendimento e o chat interno). Lê a store na
 * hora, não por assinatura: os dois estão dentro de handlers de socket, que
 * capturariam o valor da montagem.
 */
export const podeTocarSom = (): boolean => {
  const { preferencias } = usePreferenciasStore.getState();

  return preferencias.notif_habilitadas === true && preferencias.notif_som === true;
};

/**
 * Decide se e como um evento vira aviso, e o dispara.
 *
 * Num lugar só porque são quatro pontos de disparo (mensagem na fila, mensagem
 * em atendimento, chat interno, transferência), e replicar a regra faria os
 * quatro divergirem na primeira mudança.
 *
 * **A regra:**
 * 1. A chave geral e a preferência do evento precisam estar ligadas.
 * 2. Com o portal **na frente** (aba visível, janela em foco):
 *    - se a mensagem é da conversa aberta no chat, silêncio - ela já apareceu;
 *    - senão, **alerta na tela**.
 * 3. Com o portal **em segundo plano**: **notificação do navegador**.
 *
 * Os dois canais se revezam, nunca aparecem juntos - decisão do usuário,
 * seguindo a referência que ele trouxe. O som é à parte: ver `podeTocarSom`.
 */
export const useAvisarEvento = () => {
  const { notificar, permitida, podeNotificarAgora } = useNotificacaoDispositivo();
  const mostrarAlerta = useAlertasTelaStore((s) => s.mostrar);
  const pathname = usePathname();

  const avisar = useCallback(
    ({ preferencia, titulo, corpo, icone, tag, url, aoClicar, conversaAberta }: Aviso) => {
      // Da store na hora: quem chama está dentro de handler de socket.
      const { preferencias } = usePreferenciasStore.getState();

      if (preferencias.notif_habilitadas !== true) return;
      if (preferencias[preferencia] !== true) return;

      const abaOculta = typeof document !== 'undefined' && document.hidden;
      const semFoco = typeof document !== 'undefined' && !document.hasFocus();
      const olhandoAgora = !abaOculta && !semFoco;

      if (olhandoAgora) {
        /**
         * ⚠️ Estar no `/chat` **não** basta para o silêncio: é preciso ser a
         * conversa aberta. Generalizar isso já deixou o portal mudo com a lista
         * aberta e nenhuma conversa selecionada. É também a regra do Whaticket
         * (`NotificationsPopOver`): `ticketId === atual && visível`.
         */
        const jaApareceu = Boolean(pathname?.startsWith('/chat')) && conversaAberta === true;

        if (jaApareceu) return;

        if (preferencias.notif_alerta_tela === true) {
          mostrarAlerta({ titulo, corpo, icone, tag, aoClicar });
        }

        return;
      }

      // Em segundo plano. A permissão é lida do navegador agora, não do
      // estado: ela costuma ser concedida depois de este componente montar.
      if (preferencias.notif_navegador !== true) return;
      if (!podeNotificarAgora()) return;

      notificar({ titulo, corpo, icone, tag, url, aoClicar });
    },
    [podeNotificarAgora, pathname, notificar, mostrarAlerta],
  );

  return { avisar, permitida };
};
