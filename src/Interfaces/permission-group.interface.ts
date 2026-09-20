/** Uma permissão do catálogo, no formato `modulo:acao`. */
export type PermissionResponse = {
  id: number;
  /** O identificador usado nas checagens — ex.: `client:delete`. */
  name: string;
  /** Texto legível, para a tela — ex.: "Remover cliente". */
  label: string;
  permission_module_id: number;
};

/** Agrupador de permissões na tela de cadastro — ex.: "Clientes". */
export type PermissionModuleResponse = {
  id: number;
  nome: string;
};

/** Conjunto nomeado de permissões, atribuído aos usuários. */
export type PermissionGroupResponse = {
  id: number;
  name: string;
  description: string | null;
  /**
   * Grupo de fábrica: as permissões podem ser alteradas, o grupo não pode ser
   * excluído.
   */
  is_system: boolean;
  permissions: PermissionResponse[];
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};
