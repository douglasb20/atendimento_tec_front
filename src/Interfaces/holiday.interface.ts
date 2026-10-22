/**
 * Feriado cadastrado - global, usado pelo nó "Feriados" do chatbot.
 *
 * Espelha `back/src/holidays/`. Dois modos de data: `recurring = true` grava
 * só `month`/`day` (vale todo ano); `recurring = false` grava `year` também
 * (feriados móveis, como Páscoa e Carnaval, que mudam de data a cada ano).
 */
export type HolidayResponse = {
  id: number;
  name: string;
  recurring: boolean;
  /** Feriado nacional fixo (seed) - nome editável, mas data e exclusão são
   * bloqueadas pelo backend. */
  is_system: boolean;
  year: number | null;
  month: number;
  day: number;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};
