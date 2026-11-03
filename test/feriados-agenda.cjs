// Executar na pasta front: TZ=America/Sao_Paulo node test/feriados-agenda.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const fonte = fs.readFileSync('src/service/FeriadosAgenda.ts', 'utf8');
const compilado = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const modulo = { exports: {} };
new Function('exports', compilado.outputText)(modulo.exports);
const { eventosFeriadosAgenda } = modulo.exports;
const feriado = (dados = {}) => ({ id: 1, name: 'Finados', recurring: true, month: 11, day: 2, year: null, deleted_at: null, ...dados });
const gerar = (lista, inicio, fim) => eventosFeriadosAgenda(lista, new Date(`${inicio}T00:00:00`), new Date(`${fim}T00:00:00`));

const novembro = gerar([feriado(), feriado({ id: 2, day: 15 })], '2026-11-02', '2026-11-15');
assert.equal(novembro.length, 1); // Início inclusivo, fim exclusivo.
assert.equal(novembro[0].start, '2026-11-02');
assert.equal(novembro[0].allDay, true);
assert.equal(novembro[0].editable, false);
assert.equal(novembro[0].extendedProps.feriado, true);
assert.equal(novembro[0].title, 'Finados');

const mesNovembro = gerar([feriado(), feriado({ id: 2, day: 15 }), feriado({ id: 3, day: 20 })], '2026-11-01', '2026-12-01');
assert.deepEqual(mesNovembro.map(evento => evento.start), ['2026-11-02', '2026-11-15', '2026-11-20']);

assert.equal(gerar([feriado({ recurring: false, year: 2025 })], '2026-11-01', '2026-12-01').length, 0);
assert.equal(gerar([feriado({ recurring: false, year: 2026 })], '2026-11-01', '2026-12-01').length, 1);
assert.equal(gerar([feriado({ deleted_at: '2026-01-01' })], '2026-11-01', '2026-12-01').length, 0);

const virada = gerar([feriado({ month: 1, day: 1 })], '2026-12-28', '2027-01-05');
assert.equal(virada[0].start, '2027-01-01');
const anual = gerar([feriado()], '2026-01-01', '2028-01-01');
assert.equal(anual.length, 2);
assert.notEqual(anual[0].id, anual[1].id);

const bissexto = feriado({ month: 2, day: 29 });
assert.equal(gerar([bissexto], '2027-02-01', '2027-03-02').length, 0);
assert.equal(gerar([bissexto], '2028-02-01', '2028-03-02')[0].start, '2028-02-29');
assert.equal(gerar([feriado(), feriado({ id: 2, name: 'Feriado local' })], '2026-11-01', '2026-12-01').length, 2);

// Usa o cálculo real do FullCalendar para conferir a janela e a navegação diária.
const programacao = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync('src/service/ProgramacaoAgenda.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(programacao.exports);
const { DateEnv, DateProfileGenerator, createDuration, greatestDurationDenominator } = require('@fullcalendar/core/internal');
const visao = programacao.exports.VISOES_PROGRAMACAO.listProgramacao;
const dateEnv = new DateEnv({ timeZone: 'UTC', calendarSystem: 'gregory', locale: { week: { dow: 1, doy: 4 }, options: {} } });
const duracao = createDuration(visao.duration);
const gerador = new DateProfileGenerator({ dateEnv, duration: duracao,
  durationUnit: greatestDurationDenominator(duracao).unit, dateAlignment: visao.dateAlignment,
  dateIncrement: createDuration(visao.dateIncrement), showNonCurrentDates: true });
const hoje = dateEnv.createMarker('2026-11-03T16:00:00');
const perfil = gerador.build(hoje);
assert.equal(perfil.currentRange.start.toISOString(), '2026-11-03T00:00:00.000Z');
assert.equal(perfil.currentRange.end.toISOString(), '2027-02-01T00:00:00.000Z');
assert.equal(gerador.buildPrev(perfil, hoje).currentRange.start.toISOString(), '2026-11-02T00:00:00.000Z');
assert.equal(gerador.buildNext(perfil, hoje).currentRange.start.toISOString(), '2026-11-04T00:00:00.000Z');
assert.equal(gerar([feriado()], '2026-11-03', '2027-02-01').length, 0);
assert.equal(gerar([feriado()], '2026-11-02', '2027-01-31').length, 1);
console.log(`Feriados da agenda validados (${process.env.TZ || 'fuso local'}): recorrência, datas pontuais, exclusões, virada de ano, 29/02 e limites do período.`);
