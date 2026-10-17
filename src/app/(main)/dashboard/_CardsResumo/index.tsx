'use client';

import { useEffect, useState } from 'react';

import useApi from '@/service/Api/ApiClient';
import { CatchAlerta, duracaoCompacta } from '@/service/Util';

/** Os quatro números da home, como o backend os devolve. */
type ResumoDashboard = {
  contatos: number;
  finalizados: number;
  emAtendimento: number;
  /** Em segundos; `null` enquanto não houver atendimento finalizado. */
  tempoMedioSegundos: number | null;
};

type Card = {
  titulo: string;
  valor: string;
  icone: string;
  /** A cor do accent: borda de cima, fundo e traço do ícone. */
  cor: string;
  ajuda: string;
};

const CardResumo = ({ card, carregando }: { card: Card; carregando: boolean }) => (
  <div className="col-12 sm:col-6 xl:col-3">
    <div
      className="card h-full mb-0 flex align-items-center justify-content-between gap-3"
      /*
       * O accent vai só no topo, e por isso **não** usa a classe de cor do
       * PrimeFlex: ela é `border-color: ... !important` nos quatro lados, que
       * vence tanto as outras classes quanto o estilo inline - foi o que
       * pintava o card inteiro. Aqui a borda de cima é declarada sozinha, e as
       * demais ficam com o `1px solid var(--surface-border)` da classe `card`.
       */
      style={{ borderTop: `2px solid var(--${card.cor}-500)` }}
      title={card.ajuda}
    >
      <div className="flex flex-column gap-2 min-w-0">
        <span className="text-500 text-sm font-medium white-space-nowrap overflow-hidden text-overflow-ellipsis">
          {card.titulo}
        </span>
        {carregando ? (
          // Um bloco da altura do número, para o card não "pular" quando o
          // valor chega.
          <span
            className="surface-200 border-round"
            style={{ width: '3.5rem', height: '2.25rem' }}
          />
        ) : (
          <span className="text-900 font-bold text-3xl line-height-1">{card.valor}</span>
        )}
      </div>

      <span
        className={`bg-${card.cor}-100 text-${card.cor}-600 border-round flex align-items-center justify-content-center flex-none`}
        style={{ width: '3rem', height: '3rem' }}
      >
        <i className={`${card.icone} text-xl`} />
      </span>
    </div>
  </div>
);

const CardsResumo = () => {
  const { FetchReq } = useApi();
  const [resumo, setResumo] = useState<ResumoDashboard | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      try {
        const dados = await FetchReq<ResumoDashboard>('ResumoDashboard');
        // A home pode ter sido trocada enquanto a resposta vinha.
        if (ativo) setResumo(dados);
      } catch (err) {
        CatchAlerta(err, 'Não foi possível carregar os números do painel');
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

  const cards: Card[] = [
    {
      titulo: 'Contatos',
      valor: String(resumo?.contatos ?? 0),
      icone: 'fa-regular fa-address-book',
      cor: 'blue',
      ajuda: 'Contatos ativos cadastrados',
    },
    {
      titulo: 'Atendimentos finalizados',
      valor: String(resumo?.finalizados ?? 0),
      icone: 'fa-regular fa-circle-check',
      cor: 'green',
      ajuda: 'Total de atendimentos encerrados, de qualquer forma',
    },
    {
      titulo: 'Em atendimento',
      valor: String(resumo?.emAtendimento ?? 0),
      icone: 'fa-regular fa-comments',
      cor: 'orange',
      ajuda: 'Conversas abertas neste momento, incluindo as pausadas',
    },
    {
      titulo: 'Tempo médio',
      valor: duracaoCompacta(resumo?.tempoMedioSegundos ?? null),
      icone: 'fa-regular fa-clock',
      cor: 'purple',
      ajuda: 'Duração média dos atendimentos finalizados, sem contar as pausas',
    },
  ];

  return (
    <div className="grid">
      {cards.map((card) => (
        <CardResumo
          key={card.titulo}
          card={card}
          carregando={carregando}
        />
      ))}
    </div>
  );
};

export default CardsResumo;
