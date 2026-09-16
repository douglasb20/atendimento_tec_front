export type IntegrationProviderResponse = {
  id: number;
  name: string;
  /** Identificador que a factory usa para resolver a implementação. */
  slug: 'evolution' | 'meta_cloud' | 'wwebjs' | string;
  is_active: boolean;
};

export type IntegrationResponse = {
  id: number;
  integration_provider_id: number;
  name: string;
  base_url: string | null;
  /** Endereço que o provider chama de volta com os eventos. */
  webhook_url: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  integrationProvider?: IntegrationProviderResponse;
};

/**
 * As credenciais **nunca** vêm da API — são `select: false` na entidade e só
 * saem pelos métodos internos dos providers. O formulário as envia, nunca as lê.
 */
export type IntegrationFormPayload = {
  integration_provider_id: number;
  name: string;
  base_url?: string;
  webhook_url?: string;
  credentials?: Record<string, string>;
  is_default?: boolean;
  is_active?: boolean;
};

export type TesteConexaoResponse = {
  ok: boolean;
  mensagem: string;
  instancias?: number;
};
