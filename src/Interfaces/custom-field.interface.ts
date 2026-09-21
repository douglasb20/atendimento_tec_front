/** Como o valor de um campo é editado e interpretado. */
export type TipoCampo = 'texto' | 'numero' | 'data' | 'booleano' | 'lista';

/** Onde o campo pode ser usado. */
export type AplicaA = 'contato' | 'cliente' | 'ambos';

/** Campo personalizado cadastrado no catálogo. */
export type CustomFieldResponse = {
  id: number;
  nome: string;
  tipo: TipoCampo;
  aplica_a: AplicaA;
  /** As opções, quando `tipo = 'lista'`; nulo nos demais. */
  opcoes: string[] | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

/**
 * Um campo preenchido num contato ou cliente.
 *
 * `customField` vem junto porque o valor sozinho não diz nada - a tela precisa
 * do nome e do tipo para exibir.
 */
export type ValorCampoResponse = {
  custom_field_id: number;
  valor: string;
  customField?: CustomFieldResponse;
};

/** O que o formulário envia ao salvar. */
export type ValorCampoForm = {
  custom_field_id: number | null;
  valor: string;
};

/** Rótulos dos tipos, usados na tela do catálogo. */
export const ROTULO_TIPO: Record<TipoCampo, string> = {
  texto: 'Texto',
  numero: 'Número',
  data: 'Data',
  booleano: 'Sim/Não',
  lista: 'Lista de opções',
};

/** Rótulos de onde o campo se aplica. */
export const ROTULO_APLICA_A: Record<AplicaA, string> = {
  contato: 'Contatos',
  cliente: 'Clientes',
  ambos: 'Contatos e clientes',
};

/**
 * `aplica_a` do banco em caixas marcadas, e de volta.
 *
 * A API guarda um texto só (`contato` | `cliente` | `ambos`), mas na tela são
 * duas escolhas independentes: "Contatos e clientes" como terceira opção
 * obrigaria quem cadastra a perceber que ela equivale a marcar as duas.
 */
export const aplicaAParaLista = (valor?: AplicaA): Exclude<AplicaA, 'ambos'>[] => {
  if (valor === 'ambos') return ['contato', 'cliente'];
  if (valor === 'contato' || valor === 'cliente') return [valor];
  return [];
};

/** O caminho inverso, na hora de salvar. */
export const listaParaAplicaA = (lista?: Exclude<AplicaA, 'ambos'>[]): AplicaA => {
  const marcados = lista ?? [];

  if (marcados.length >= 2) return 'ambos';

  return marcados[0] ?? 'contato';
};
