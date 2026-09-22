/**
 * Variáveis que podem ser usadas nas mensagens automáticas.
 *
 * ⚠️ **Esta lista precisa casar com três lugares**, ou a variável não é
 * oferecida na tela ou chega crua ao WhatsApp do cliente:
 *
 * 1. `back/src/support-chats/mensagens-automaticas.ts` - a substituição real
 *    das mensagens de saudação e despedida;
 * 2. `front/src/hooks/useRespostasRapidas.ts` - a substituição das respostas
 *    rápidas, que acontece no front, na hora de inserir no chat;
 * 3. esta lista, que é o que a tela oferece.
 *
 * ⚠️ `{{nome}}` é o **primeiro nome** desde a separação de `name`/`last_name`.
 * Antes devolvia o nome inteiro; `{{nome_completo}}` preserva aquele
 * comportamento.
 *
 * O que o sistema de referência tinha e **não** temos:
 * - **e-mail do contato** - não existe a coluna, nem em `contacts` nem em
 *   `clients`;
 * - **setor** - não existe módulo de departamentos.
 *
 * Entram quando as colunas existirem.
 */
export type VariavelMensagem = {
  /** O que vai para o texto, sem as chaves. */
  chave: string;
  rotulo: string;
  /** Mostrado na pré-visualização no lugar do valor real. */
  exemplo: string;
  /** Agrupa o menu; sem isto a lista de 12 vira um paredão. */
  grupo: 'Contato' | 'Atendimento' | 'Atendente';
};

export const VARIAVEIS_MENSAGEM: VariavelMensagem[] = [
  {
    chave: 'saudacao',
    rotulo: 'Saudação pelo horário',
    exemplo: 'Boa tarde',
    grupo: 'Atendimento',
  },
  {
    chave: 'nome',
    rotulo: 'Primeiro nome do contato',
    exemplo: 'Maria',
    grupo: 'Contato',
  },
  {
    chave: 'sobrenome',
    rotulo: 'Sobrenome do contato',
    exemplo: 'Silva',
    grupo: 'Contato',
  },
  {
    chave: 'nome_completo',
    rotulo: 'Nome completo do contato',
    exemplo: 'Maria Silva',
    grupo: 'Contato',
  },
  {
    chave: 'telefone',
    rotulo: 'Número do contato',
    exemplo: '(64) 9 9269-8043',
    grupo: 'Contato',
  },
  {
    chave: 'cliente',
    rotulo: 'Nome do cliente',
    exemplo: 'Automatec Sistemas',
    grupo: 'Contato',
  },
  {
    chave: 'cnpj',
    rotulo: 'CNPJ do cliente',
    exemplo: '12.345.678/0001-90',
    grupo: 'Contato',
  },
  {
    chave: 'protocolo',
    rotulo: 'Número do protocolo',
    exemplo: '2026090000012',
    grupo: 'Atendimento',
  },
  {
    chave: 'canal',
    rotulo: 'Nome do canal',
    exemplo: 'Suporte',
    grupo: 'Atendimento',
  },
  // ⚠️ Vazias na saudação: ela é enviada na abertura da conversa, quando
  // ninguém assumiu o atendimento. Só valem na despedida e nas respostas
  // rápidas, que o atendente insere com a conversa já sua.
  {
    chave: 'atendente',
    rotulo: 'Primeiro nome do atendente',
    exemplo: 'Douglas',
    grupo: 'Atendente',
  },
  {
    chave: 'atendente_sobrenome',
    rotulo: 'Sobrenome do atendente',
    exemplo: 'Silva',
    grupo: 'Atendente',
  },
  {
    chave: 'atendente_nome_completo',
    rotulo: 'Nome completo do atendente',
    exemplo: 'Douglas Silva',
    grupo: 'Atendente',
  },
];

/** A ordem em que os grupos aparecem no menu. */
export const GRUPOS_VARIAVEIS: VariavelMensagem['grupo'][] = [
  'Contato',
  'Atendimento',
  'Atendente',
];

/**
 * Troca `{{chave}}` pelo exemplo, só para a pré-visualização.
 *
 * O valor real é substituído no backend, no ato do envio - aqui é para o
 * atendente ver como a frase fica montada.
 */
export const aplicaExemplos = (texto: string): string =>
  VARIAVEIS_MENSAGEM.reduce(
    (acumulado, variavel) =>
      acumulado.replaceAll(`{{${variavel.chave}}}`, variavel.exemplo),
    texto,
  );
