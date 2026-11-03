import type { CalendarOptions } from '@fullcalendar/core';

export const VISOES_PROGRAMACAO: CalendarOptions['views'] = {
  listProgramacao: {
    type: 'list',
    // A unidade diária mantém as setas avançando a partir do dia exibido.
    duration: { days: 90 },
    dateAlignment: 'day',
    dateIncrement: { days: 1 },
    listDayFormat: { day: 'numeric', month: 'short', weekday: 'short' },
    listDaySideFormat: false,
  },
};

export function tituloProgramacaoAgenda(inicio: Date, fimExclusivo: Date): string {
  const ultimoDia = new Date(fimExclusivo);
  ultimoDia.setDate(ultimoDia.getDate() - 1);
  const formato = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${formato.format(inicio)} a ${formato.format(ultimoDia)}`;
}
