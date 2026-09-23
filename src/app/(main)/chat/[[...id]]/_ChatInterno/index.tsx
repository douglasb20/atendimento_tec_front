'use client';

import { useAvisoDeAtividade } from '@/hooks/useAvisoDeAtividade';
import { useChatInterno } from '@/hooks/useChatInterno';
import { usePermissoes } from '@/hooks/usePermissoes';
import { useCarregarPreferencias } from '@/hooks/usePreferencias';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';
import { ColegaResponse } from '@/Interfaces';
import { useChatInternoStore } from '@/store/useChatInternoStore';
import PopupInterno from './PopupInterno';

export { default as ListaColegas } from './ListaColegas';
export { default as JanelaInterna } from './JanelaInterna';
export { default as PopupInterno } from './PopupInterno';

/**
 * Raiz do chat interno, montada em `(main)/layout.tsx`.
 *
 * ⚠️ **Um lugar só.** É aqui que `useChatInterno` roda, e ele assina os quatro
 * eventos de socket. Montar este componente duas vezes faria cada mensagem
 * entrar duplicada na store.
 *
 * Vive fora de `/chat` para o popup sobreviver à navegação: abrir a conversa,
 * ir a Clientes e continuar falando.
 */
const ChatInterno = () => {
  const { podeVisualizar, carregado } = usePermissoesModulo('internal.chat');
  const { ehSuperusuario } = usePermissoes();

  // ⚠️ Aqui o superusuário é o único que **não** entra - o contrário do resto
  // do portal, onde ele passa por qualquer permissão. É a conta de instalação,
  // não um atendente, e o backend responde 403 em todas as rotas do módulo.
  // Sem esta checagem o hook dispararia dois alertas de erro a cada carga.
  const ativo = carregado && podeVisualizar && !ehSuperusuario;

  // As preferências governam as notificações do portal inteiro, não só do chat
  // interno - por isso a carga não depende de `ativo`. O master também as tem.
  useCarregarPreferencias();

  useChatInterno({ ativo });

  // Alimenta a presença: sem os avisos de interação, todo mundo apareceria
  // ausente dez minutos depois de entrar.
  useAvisoDeAtividade({ ativo });

  if (!ativo) return null;

  return <PopupInterno />;
};

export default ChatInterno;

/** Abre a conversa com um colega, de qualquer lugar da aplicação. */
export const abrirConversaInterna = (colega: ColegaResponse) =>
  useChatInternoStore.getState().abrirCom(colega);
