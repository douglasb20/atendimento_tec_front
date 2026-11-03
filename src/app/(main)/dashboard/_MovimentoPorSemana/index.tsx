'use client';

import { Chart } from 'primereact/chart';
import { Dropdown } from 'primereact/dropdown';
import { useEffect, useMemo, useState } from 'react';
import { useCoresDoTema } from '@/hooks/useCoresDoTema';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta } from '@/service/Util';

type PontoDiaSemana = { diaSemana: number; total: number };
type Periodo = 'esta_semana' | 'este_mes' | 'ultimos_seis_meses';
const PERIODOS: { label: string; value: Periodo }[] = [
  { label: 'Esta semana', value: 'esta_semana' },
  { label: 'Este mês', value: 'este_mes' },
  { label: 'Últimos 6 meses', value: 'ultimos_seis_meses' },
];
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function MovimentoPorSemana() {
  const { FetchReq } = useApi();
  const cores = useCoresDoTema('--indigo-500');
  const [periodo, setPeriodo] = useState<Periodo>('esta_semana');
  const [serie, setSerie] = useState<PontoDiaSemana[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setFalhou(false);
    const carregar = async () => {
      try {
        const dados = await FetchReq<PontoDiaSemana[]>({ endpoint: 'MovimentoPorSemanaDashboard', variables: [periodo] });
        if (ativo) setSerie(dados ?? []);
      } catch (erro) {
        if (ativo) {
          setFalhou(true);
          CatchAlerta(erro, 'Não foi possível carregar os atendimentos por dia da semana');
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    };
    void carregar();
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  const valores = useMemo(() => DIAS.map((_, dia) => serie.find(p => p.diaSemana === dia)?.total ?? 0), [serie]);
  const total = valores.reduce((soma, valor) => soma + valor, 0);
  const data = useMemo(() => ({ labels: DIAS, datasets: [{ label: 'Atendimentos', data: valores,
    backgroundColor: cores?.linha ?? '#6366f1', maxBarThickness: 36,
    borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 }, borderSkipped: false as const,
  }] }), [valores, cores]);
  const options = useMemo(() => ({ maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: {
      label: (ctx: { parsed: { y: number } }) => `${ctx.parsed.y} ${ctx.parsed.y === 1 ? 'atendimento' : 'atendimentos'}`,
    } } },
    scales: {
      x: { ticks: { color: cores?.texto, maxRotation: 0, autoSkip: false }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { color: cores?.texto, precision: 0 }, grid: { color: cores?.grade }, border: { display: false } },
    },
  }), [cores]);

  return <div className="card mb-0 h-full">
    <div className="flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
      <span className="text-900 font-semibold">Atendimentos por dia da semana</span>
      <Dropdown value={periodo} options={PERIODOS} onChange={e => setPeriodo(e.value)}
        aria-label="Período dos atendimentos por dia da semana" className="text-sm" />
    </div>
    {carregando || !cores ? <div className="surface-200 border-round" style={{ height: '14rem' }} />
      : falhou ? <div className="flex align-items-center justify-content-center text-color-secondary" style={{ height: '14rem' }}>
        Não foi possível carregar os atendimentos.
      </div> : <Chart type="bar" data={data} options={options} style={{ height: '14rem' }} />}
    <div className="flex align-items-center justify-content-between gap-2 mt-3 pt-3 border-top-1 surface-border">
      <span className="text-color-secondary text-sm">Total de atendimentos</span>
      <span className="text-900 font-semibold">{carregando || falhou ? '—' : total.toLocaleString('pt-BR')}</span>
    </div>
    <small className="text-color-secondary">Atendimentos iniciados no período.</small>
  </div>;
}
