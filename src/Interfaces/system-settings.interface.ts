/** Um ajuste do sistema, com a definição vinda do catálogo do backend. */
export type AjusteSistema = {
  chave: string;
  rotulo: string;
  descricao: string;
  tipo: 'inteiro' | 'texto' | 'senha' | 'booleano';
  grupo: 'comportamento' | 'email';
  unidade?: string;
  min?: number;
  max?: number;
  /** Ausente nas chaves de senha - estas nunca saem da API. */
  valor?: string | number;
  /** Só para senhas: se há algo gravado, sem revelar o quê. */
  definido?: boolean;
};

export type ResultadoTesteEmail = { ok: boolean; erro?: string };
