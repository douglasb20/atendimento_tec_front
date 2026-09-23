/**
 * Preferências do usuário.
 *
 * Espelha `back/src/user-config/user-config.catalogo.ts`. Acrescentar uma
 * preferência lá exige acrescentá-la aqui - o backend a aceitaria, mas o front
 * não saberia lê-la.
 */

export type TipoPreferencia = 'texto' | 'booleano';

/** As que governam notificação - o `useAvisarEvento` só aceita estas. */
export type ChavePreferenciaNotificacao =
  | 'notif_chat_interno'
  | 'notif_mensagem_cliente'
  | 'notif_fila'
  | 'notif_transferencia';

/**
 * Governa *quando* avisar, não *o quê*.
 *
 * Separada das de cima porque não é um evento: nenhum disparo a passa como
 * `preferencia`, e o `useAvisarEvento` a lê por conta própria.
 */
export type ChavePreferenciaComportamento = 'notif_com_portal_aberto';

export type ChavePreferencia =
  | 'tema'
  | 'modo_tema'
  | ChavePreferenciaNotificacao
  | ChavePreferenciaComportamento;

/** O mapa de valores, como vem no cookie `userInfo`. */
export type PreferenciasUsuario = Record<ChavePreferencia, string | boolean>;

/** Uma preferência com a definição, como `GET /user-config` a devolve. */
export type PreferenciaParaTela = {
  chave: ChavePreferencia;
  rotulo: string;
  descricao: string;
  tipo: TipoPreferencia;
  grupo: 'aparencia' | 'notificacoes';
  padrao: string | boolean;
  opcoes?: readonly string[];
  valor: string | boolean;
};
