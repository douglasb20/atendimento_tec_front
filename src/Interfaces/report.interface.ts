/**
 * Uma linha do relatório de atendimentos.
 *
 * Os nomes acompanham o backend (`AttendanceRow`), como as demais respostas
 * de API - são o que a consulta devolve, não nomes de domínio nossos.
 *
 * As durações vêm em **segundos**, não formatadas: a tela decide como
 * exibi-las (`duracaoCompacta`), e o Excel precisa do número para somar.
 */
export type LinhaRelatorioAtendimento = {
  id: string;
  protocolo: string;
  contato: string;
  telefone: string | null;
  cliente: string | null;
  atendente: string | null;
  setor: string | null;
  canal: string | null;
  aberto_em: string;
  atendido_em: string | null;
  finalizado_em: string | null;
  /**
   * Resposta até o encerramento, **sem** o tempo pausado. Nulo em aberto, e
   * também quando ninguém assumiu a conversa - sem `atendido_em` não há o
   * que medir como duração de atendimento, só a espera abaixo.
   */
  duracao_segundos: number | null;
  /**
   * Abertura até alguém assumir - ou, se nunca foi assumido mas já foi
   * finalizado, até o fechamento (o tempo que passou esperando antes de ser
   * encerrado sem resposta). Nulo só enquanto a conversa segue aberta e sem
   * dono.
   */
  espera_segundos: number | null;
  situacao: string;
  is_final: boolean;
};

/** Os números do rodapé, sobre o filtro inteiro. */
export type TotaisRelatorioAtendimento = {
  total: number;
  finalizados: number;
  em_aberto: number;
  duracao_media_segundos: number | null;
  espera_media_segundos: number | null;
};

export type RelatorioAtendimentoResponse = {
  linhas: LinhaRelatorioAtendimento[];
  totais: TotaisRelatorioAtendimento;
};

/** Como o relatório por cliente agrupa as linhas - ver `LinhaRelatorioCliente`. */
export type AgrupamentoRelatorioCliente = 'client' | 'contact';

/** As opções do dropdown de ordenação do relatório por cliente - vale igual na tela e nas exportações. */
export type OrdenacaoRelatorioCliente =
  | 'mais_atendimentos'
  | 'menos_atendimentos'
  | 'mais_finalizados'
  | 'menos_finalizados'
  | 'mais_em_aberto'
  | 'menos_em_aberto'
  | 'mais_tempo_total'
  | 'menos_tempo_total'
  | 'mais_espera_media'
  | 'menos_espera_media';

/**
 * As opções do dropdown de ordenação do relatório de Atendimentos/tela de
 * Histórico - linha a linha, por isso é sobre o atendimento em si, e não
 * agregado como `OrdenacaoRelatorioCliente`.
 */
export type OrdenacaoAtendimentos =
  | 'mais_recentes'
  | 'mais_antigos'
  | 'maior_duracao'
  | 'menor_duracao'
  | 'maior_espera'
  | 'menor_espera';

/**
 * Os filtros da tela, como vão para a API.
 *
 * Ausente significa "todos" - é assim que se diz "sem recorte" em HTTP, e é o
 * que o item "Todos" do select vira ao ser enviado.
 */
export type FiltroRelatorio = {
  de?: Date | null;
  ate?: Date | null;
  user_id?: number | null;
  /**
   * Array para suportar multiseleção (hoje só no relatório de Atendimentos) -
   * os demais continuam mandando um `number` só, que o backend trata igual a
   * um array de um elemento.
   */
  department_id?: number[] | number | null;
  channel_id?: number[] | number | null;
  client_id?: number | null;
  /** Só no relatório analítico: o contato específico escolhido na busca. */
  contact_id?: number | null;
  support_chat_status_id?: number[] | number | null;
  busca?: string;
  /** Só no relatório por cliente. */
  agrupar_por?: AgrupamentoRelatorioCliente;
  /** Só no relatório por cliente, e só quando `agrupar_por` é `client`. */
  ignorar_sem_cliente?: boolean;
  /** Só no relatório por cliente. Ausente = "mais atendimentos". */
  ordenar_por?: OrdenacaoRelatorioCliente;
  /** Relatório de Atendimentos e tela de Histórico. Ausente = "mais recentes". */
  ordenar_atendimentos_por?: OrdenacaoAtendimentos;
};

/** Um resultado da busca do relatório analítico - cliente ou contato juntos. */
export type ResultadoBuscaCliente = {
  id: number;
  nome: string;
  tipo: AgrupamentoRelatorioCliente;
};

/**
 * Uma linha do relatório de produtividade - um atendente por linha, e não um
 * atendimento por linha como no relatório de atendimentos.
 */
export type LinhaRelatorioProdutividade = {
  atendente: string;
  total: number;
  finalizados: number;
  em_aberto: number;
  /** Mensagens digitadas pelo atendente nos atendimentos da linha - exclui as automáticas. */
  mensagens_enviadas: number;
  /** Soma das durações dos atendimentos finalizados, já descontada a pausa - não é média. */
  duracao_total_segundos: number;
  duracao_media_segundos: number | null;
  espera_media_segundos: number | null;
};

/** O rodapé: soma das linhas, com as médias sendo a média das médias. */
export type TotaisRelatorioProdutividade = {
  total: number;
  finalizados: number;
  em_aberto: number;
  mensagens_enviadas: number;
  duracao_total_segundos: number;
  duracao_media_segundos: number | null;
  espera_media_segundos: number | null;
};

export type RelatorioProdutividadeResponse = {
  linhas: LinhaRelatorioProdutividade[];
  totais: TotaisRelatorioProdutividade;
};

/**
 * Uma linha do relatório por cliente/contato - mesmas métricas de
 * produtividade, trocando "quem atendeu" por "quem foi atendido".
 */
export type LinhaRelatorioCliente = {
  /** `id` do cliente ou do contato, conforme `agrupar_por` - nulo só na linha "Sem cliente". */
  id: number | null;
  /** Nome do cliente ou do contato, conforme `agrupar_por` do filtro. */
  nome: string;
  total: number;
  finalizados: number;
  em_aberto: number;
  duracao_total_segundos: number;
  duracao_media_segundos: number | null;
  espera_media_segundos: number | null;
};

export type TotaisRelatorioCliente = {
  total: number;
  finalizados: number;
  em_aberto: number;
  duracao_total_segundos: number;
  duracao_media_segundos: number | null;
  espera_media_segundos: number | null;
};

export type RelatorioClienteResponse = {
  linhas: LinhaRelatorioCliente[];
  totais: TotaisRelatorioCliente;
};
