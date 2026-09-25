/**
 * Setor de atendimento: agrupa os usuários que atendem um assunto.
 *
 * Espelha `back/src/departments/`. Na API e no banco é `department`; na tela e
 * no código de domínio, "setor".
 */
export type DepartmentResponse = {
  id: number;
  name: string;
  description: string | null;
  /** Texto exibido ao contato fora do horário configurado. */
  absence_message?: string | null;
  /** Quantos usuários ativos estão no setor. Só vem na listagem. */
  total_usuarios?: number;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

/** Usuário ativo, com um booleano dizendo se já está no setor consultado. */
export type MembroSetorResponse = {
  id: number;
  name: string;
  last_name: string | null;
  email: string;
  membro: boolean;
};

/** Um intervalo de horário de atendimento, num dia da semana (0 domingo .. 6 sábado). */
export type ScheduleInterval = { weekday: number; start_time: string; end_time: string };

/** O horário de atendimento do setor - lista vazia significa sempre disponível. */
export type DepartmentScheduleResponse = {
  intervals: ScheduleInterval[];
  absence_message: string | null;
};
