'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';

import { ChavePreferenciaNotificacao } from '@/Interfaces';
import { useNotificacaoDispositivo } from './useNotificacaoDispositivo';
import { usePreferencias } from './usePreferencias';

type Aviso = {
  /** Qual preferência governa este evento. */
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
   * É o **único** caso em que o silêncio faz sentido com a aba visível: a
   * bolha aparece na hora, na frente da pessoa. Quem chama sabe disso; o hook
   * não tem como saber.
   */
  conversaAberta?: boolean;
};

/**
 * Decide se um evento merece notificação, e a dispara.
 *
 * A regra mora aqui, num lugar só, porque são quatro pontos de disparo
 * (chat interno, mensagem de cliente, fila, transferência) e replicá-la faria
 * as quatro divergirem na primeira mudança.
 *
 * **Notifica quando a pessoa não veria de outro jeito:**
 * - a aba está oculta (outra aba, janela minimizada), ou
 * - a janela está sem foco (outro programa na frente), ou
 * - ela está no portal, mas fora do `/chat` - onde a mensagem não aparece.
 *
 * Com o chat na frente e em foco, o silêncio é proposital: a bolha já está na
 * tela, e avisar seria repetir o que a pessoa acabou de ver.
 */
export const useAvisarEvento = () => {
  const { notificar, permitida, podeNotificarAgora } = useNotificacaoDispositivo();
  const { preferencias } = usePreferencias();
  const pathname = usePathname();

  const avisar = useCallback(
    ({ preferencia, titulo, corpo, icone, tag, url, aoClicar, conversaAberta }: Aviso) => {
      // Lido do navegador agora, não do estado: a permissão costuma ser
      // concedida **depois** de este componente montar, no modal de Perfil.
      if (!podeNotificarAgora()) return;
      if (preferencias[preferencia] !== true) return;

      const abaOculta = typeof document !== 'undefined' && document.hidden;
      const semFoco = typeof document !== 'undefined' && !document.hasFocus();
      const noChat = Boolean(pathname?.startsWith('/chat'));

      // A pessoa está olhando o portal agora: aba visível, janela em foco.
      const olhandoAgora = !abaOculta && !semFoco;

/**
       * O único caso de silêncio com a aba visível: a mensagem chegou **na
       * conversa que está aberta**, e a bolha já apareceu na frente da pessoa.
       *
       * ⚠️ Estar na tela de chat **não** basta. Cheguei a generalizar assim ao
       * tentar resolver um relato de "não notifica", e piorou: com a lista
       * aberta e nenhuma conversa selecionada, nada avisava. É também a regra
       * do Whaticket, conferida no código dele (`NotificationsPopOver`):
       * `ticketId === atual && document.visibilityState === 'visible'`.
       *
       * `notif_com_portal_aberto` dispensa até esse silêncio.
       */
      const veriaAcontecer =
        olhandoAgora &&
        noChat &&
        conversaAberta === true &&
        preferencias.notif_com_portal_aberto !== true;

      if (veriaAcontecer) return;

      notificar({ titulo, corpo, icone, tag, url, aoClicar });
    },
    [podeNotificarAgora, preferencias, pathname, notificar],
  );

  return { avisar, permitida };
};
