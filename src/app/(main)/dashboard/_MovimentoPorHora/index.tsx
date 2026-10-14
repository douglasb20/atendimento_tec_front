'use client';

import { Chart } from 'primereact/chart';
import { useEffect, useMemo, useState } from 'react';

import { useCoresDoTema } from '@/hooks/useCoresDoTema';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta } from '@/service/Util';

/** Uma hora do dia, como o backend devolve. */
type PontoHora = {
  /** 0 a 23. */
  hora: number;
  total: number;
};

const MovimentoPorHora = () => {
  const { FetchReq } = useApi();
  const [serie, setSerie] = useState<PontoHora[]>([]);
  const [carregando, setCarregando] = useState(true);
  const cores = useCoresDoTema('--indigo-500');

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      try {
        const dados = await FetchReq<PontoHora[]>('MovimentoPorHoraDashboard');
        if (ativo) setSerie(dados ?? []);
      } catch (err) {
        CatchAlerta(err, 'Não foi possível carregar o movimento por hora');
      } finally {
        if (ativo) setCarregando(false);
      }
    };

    carregar();

    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, options } = useMemo(() => {
    const cor = cores?.linha ?? '#6366f1';

    return {
      data: {
        labels: serie.map((ponto) => `${String(ponto.hora).padStart(2, '0')}h`),
        datasets: [
          {
            label: 'Atendimentos',
            data: serie.map((ponto) => ponto.total),
            backgroundColor: cor,
            // Topo arredondado, base reta: a barra cresce de uma linha só.
            borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
            borderSkipped: false as const,
            maxBarThickness: 24,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          // Série única: o título do card já diz o que é.
          legend: { display: false },
          tooltip: {
            callbacks: {
              // "09h" sozinho sugere o instante; a faixa deixa claro que a
              // barra conta a hora inteira.
              title: (itens: { label: string }[]) => {
                const hora = parseInt(itens[0].label, 10);
                return `Das ${String(hora).padStart(2, '0')}h às ${String(hora).padStart(2, '0')}h59`;
              },
              label: (ctx: { parsed: { y: number } }) =>
                `${ctx.parsed.y} ${ctx.parsed.y === 1 ? 'atendimento' : 'atendimentos'}`,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: cores?.texto,
              // 24 rótulos não cabem em tela estreita; o Chart.js decide
              // quantos mostrar, mas nunca girados - deitado fica ilegível.
              maxRotation: 0,
              autoSkip: true,
            },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            // Contagem não tem meio atendimento.
            ticks: { color: cores?.texto, precision: 0 },
            grid: { color: cores?.grade },
            border: { display: false },
          },
        },
      },
    };
  }, [serie, cores]);

  return (
    <div className="card mb-0">
      <div className="flex align-items-center justify-content-between gap-2 mb-3">
        <span className="text-900 font-semibold">Movimento por hora</span>
        <span className="text-500 text-sm">últimos 30 dias</span>
      </div>

      {carregando || !cores ? (
        <div
          className="surface-200 border-round"
          style={{ height: '14rem' }}
        />
      ) : (
        <Chart
          type="bar"
          data={data}
          options={options}
          style={{ height: '14rem' }}
        />
      )}
    </div>
  );
};

export default MovimentoPorHora;
