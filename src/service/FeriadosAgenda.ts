import type { EventInput } from '@fullcalendar/core';
import type { HolidayResponse } from '@/Interfaces';

/** Datas de dia inteiro não levam UTC: meia-noite UTC viraria a véspera no Brasil. */
export const dataLocalAgenda = (data: Date): string =>
  `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;

export function eventosFeriadosAgenda(feriados: HolidayResponse[], inicio: Date, fim: Date): EventInput[] {
  const eventos: EventInput[] = [];
  for (const feriado of feriados) {
    if (feriado.deleted_at) continue;
    for (let ano = inicio.getFullYear(); ano <= fim.getFullYear(); ano++) {
      if (!feriado.recurring && feriado.year !== ano) continue;
      const data = new Date(ano, feriado.month - 1, feriado.day);
      // Impede que 29/02 vire 01/03 nos anos que não são bissextos.
      if (data.getMonth() !== feriado.month - 1 || data.getDate() !== feriado.day) continue;
      if (data < inicio || data >= fim) continue;
      eventos.push({
        id: `feriado-${feriado.id}-${ano}`,
        title: feriado.name,
        start: dataLocalAgenda(data),
        allDay: true,
        display: 'block',
        editable: false,
        backgroundColor: '#15803d',
        borderColor: '#15803d',
        textColor: '#ffffff',
        classNames: ['agenda-evento-feriado'],
        extendedProps: { feriado: true },
      });
    }
  }
  return eventos;
}
