'use client';

import { Chart } from 'primereact/chart';
import { useEffect, useMemo, useState } from 'react';

import { useCoresDoTema } from '@/hooks/useCoresDoTema';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta } from '@/service/Util';

/** Um dia da série, como o backend devolve. */
type PontoSerie = {
  /** `YYYY-MM-DD`, já no fuso de exibição. */
  dia: string;
  total: number;
};

/**
 * `DD/MM` para o eixo.
 *
 * O split manual evita o `new Date('2026-10-14')`, que o JS lê como UTC e
 * exibe um dia a menos em fusos negativos - o Brasil inteiro.
 */
const rotuloDoDia = (dia: string) => {
  const [, mes, diaDoMes] = dia.split('-');
  return `${diaDoMes}/${mes}`;
};

const GraficoFinalizados = () => {
  const { FetchReq } = useApi();
  const [serie, setSerie] = useState<PontoSerie[]>([]);
  const [carregando, setCarregando] = useState(true);
  const cores = useCoresDoTema();

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      try {
        const dados = await FetchReq<PontoSerie[]>('SerieFinalizadosDashboard');
        if (ativo) setSerie(dados ?? []);
      } catch (err) {
        CatchAlerta(err, 'Não foi possível carregar o gráfico de atendimentos');
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
    const cor = cores?.linha ?? '#3b82f6';
    const corTexto = cores?.texto;
    const corGrade = cores?.grade;
    const corSuperficie = cores?.superficie;

    return {
      data: {
        labels: serie.map((ponto) => rotuloDoDia(ponto.dia)),
        datasets: [
          {
            label: 'Finalizados',
            data: serie.map((ponto) => ponto.total),
            borderColor: cor,
            // Lavagem leve sob a linha: dá volume sem virar bloco sólido.
            backgroundColor: `color-mix(in srgb, ${cor} 10%, transparent)`,
            fill: true,
            borderWidth: 2,
            tension: 0.35,
            pointBackgroundColor: cor,
            // O anel na cor da superfície mantém o ponto legível onde cruza a
            // linha, e aumenta o alvo do hover.
            pointBorderColor: corSuperficie,
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        // O alvo do hover é a coluna inteira do dia, não o ponto: acertar um
        // círculo de 8px com o mouse é preciso demais.
        interaction: { mode: 'index' as const, intersect: false },
        plugins: {
          // Série única: o título do card já diz o que está plotado.
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: { parsed: { y: number } }) =>
                `${ctx.parsed.y} ${ctx.parsed.y === 1 ? 'atendimento' : 'atendimentos'}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: corTexto },
            // Vertical só atrapalha num eixo de datas: a leitura é horizontal.
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: corTexto,
              // Contagem não tem meio atendimento - sem isso o eixo mostra
              // 0,5 quando o pico é baixo.
              precision: 0,
            },
            grid: { color: corGrade },
            // `border.display` - no Chart.js 3 isto era `grid.drawBorder`, que
            // na 4 é ignorado em silêncio (esta é a 4.5).
            border: { display: false },
          },
        },
      },
    };
  }, [serie, cores]);

  return (
    <div className="card h-full mb-0">
      <div className="flex align-items-center justify-content-between gap-2 mb-3">
        <span className="text-900 font-semibold">Atendimentos finalizados</span>
        <span className="text-500 text-sm">últimos 7 dias</span>
      </div>

      {carregando || !cores ? (
        <div
          className="surface-200 border-round"
          style={{ height: '16rem' }}
        />
      ) : (
        <Chart
          type="line"
          data={data}
          options={options}
          style={{ height: '16rem' }}
        />
      )}
    </div>
  );
};

export default GraficoFinalizados;
