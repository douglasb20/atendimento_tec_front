/**
 * Preferências do usuário.
 *
 * Espelha `back/src/user-config/user-config.catalogo.ts`. Acrescentar uma
 * preferência lá exige acrescentá-la aqui - o backend a aceitaria, mas o front
 * não saberia lê-la.
 */

export type TipoPreferencia = 'texto' | 'booleano';

/** Os eventos que podem gerar aviso - o `useAvisarEvento` só aceita estes. */
export type ChavePreferenciaNotificacao =
  | 'notif_chat_interno'
  | 'notif_mensagem_cliente'
  | 'notif_fila'
  | 'notif_transferencia';

/**
 * Governam *se* e *como* avisar, não *o quê*.
 *
 * Separadas das de cima porque não são eventos: nenhum disparo as passa como
 * `preferencia`, e o `useAvisarEvento` as lê por conta própria.
 */
export type ChavePreferenciaEntrega =
  | 'notif_habilitadas'
  | 'notif_som'
  | 'notif_alerta_tela'
  | 'notif_navegador';

export type ChavePreferencia =
  | 'tema'
  | 'modo_tema'
  | ChavePreferenciaNotificacao
  | ChavePreferenciaEntrega;

/** O mapa de valores, como vem no cookie `userInfo`. */
export type PreferenciasUsuario = Record<ChavePreferencia, string | boolean>;

/** Uma preferência com a definição, como `GET /user-config` a devolve. */
export type PreferenciaParaTela = {
  chave: ChavePreferencia;
  rotulo: string;
  descricao: string;
  tipo: TipoPreferencia;
  grupo: 'aparencia' | 'notificacoes';
  /** Subdivisão da aba de notificações. */
  secao?: 'geral' | 'mensagens' | 'movimentacoes' | 'entrega';
  padrao: string | boolean;
  opcoes?: readonly string[];
  valor: string | boolean;
};
