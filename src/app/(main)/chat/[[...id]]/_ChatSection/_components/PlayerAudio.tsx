'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Player de mensagem de voz, no lugar do `<audio controls>` do navegador.
 *
 * O nativo traz o menu de três pontos do Chrome (com "baixar" e "velocidade"),
 * muda de aparência conforme o navegador e não combina com a bolha. Este é o
 * mínimo que a conversa precisa: tocar, arrastar e ver quanto falta.
 *
 * A onda é desenhada a partir do próprio arquivo, decodificado uma vez por
 * mensagem. Até ela ficar pronta o player fica em espera, com o play
 * desabilitado: antes as barras apareciam achatadas no mínimo e o botão
 * parecia pronto, mas clicar não tocava nada - o elemento ainda nem tinha os
 * metadados. Um player que parece pronto e não responde é pior do que um que
 * assume estar carregando.
 */
type PlayerAudioProps = {
  url: string;
  mimetype?: string;
  /** Muda a cor das barras para contrastar com a bolha de quem enviou. */
  proprio?: boolean;
};

/** Quantas barras a onda tem. Fixo: a largura do player não varia. */
const TOTAL_BARRAS = 40;

/**
 * Velocidades na ordem em que o botão as percorre, voltando ao início.
 *
 * Um botão que cicla em vez de um menu: são três opções, e o atendente que
 * acelera um áudio quer o gesto rápido, não abrir uma lista e escolher.
 */
const VELOCIDADES = [1, 1.5, 2];

const formataTempo = (segundos: number) => {
  if (!Number.isFinite(segundos)) return '0:00';
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/**
 * Reduz o áudio a `TOTAL_BARRAS` alturas entre 0 e 1.
 *
 * Usa o valor médio absoluto de cada fatia, não o pico: o pico faz qualquer
 * estalo virar uma barra cheia, e a onda perde a forma da fala.
 */
const extraiOnda = (buffer: AudioBuffer): number[] => {
  const amostras = buffer.getChannelData(0);
  const porBarra = Math.floor(amostras.length / TOTAL_BARRAS) || 1;
  const barras: number[] = [];

  for (let i = 0; i < TOTAL_BARRAS; i++) {
    let soma = 0;
    const inicio = i * porBarra;

    for (let j = 0; j < porBarra; j++) {
      soma += Math.abs(amostras[inicio + j] ?? 0);
    }

    barras.push(soma / porBarra);
  }

  // Normaliza pelo maior: uma gravação baixinha fica visível do mesmo jeito.
  const maior = Math.max(...barras, 0.0001);
  return barras.map((b) => b / maior);
};

/**
 * Uma cópia da onda. Renderizada duas vezes pelo player - apagada e opaca -,
 * com a de cima recortada para marcar o progresso.
 */
const Onda = ({ barras, cor, opacidade }: { barras: number[]; cor: string; opacidade: number }) => (
  <div className="flex align-items-center gap-1 h-full w-full">
    {barras.map((altura, i) => (
      <span
        key={i}
        className="flex-1 border-round"
        style={{
          // Mínimo de 15%: silêncio absoluto viraria uma barra invisível, e a
          // onda pareceria ter buracos.
          height: `${Math.max(altura, 0.15) * 100}%`,
          minWidth: 2,
          background: cor,
          opacity: opacidade,
        }}
      />
    ))}
  </div>
);

const PlayerAudio = ({ url, mimetype, proprio = false }: PlayerAudioProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [tocando, setTocando] = useState(false);
  const [duracao, setDuracao] = useState(0);
  const [posicao, setPosicao] = useState(0);
  const [onda, setOnda] = useState<number[] | null>(null);
  // Distinto de `onda === null`: a decodificação pode falhar, e aí a onda
  // segue nula mas o player deve liberar mesmo assim (com a linha plana).
  const [carregandoOnda, setCarregandoOnda] = useState(true);
  const [velocidade, setVelocidade] = useState<number>(VELOCIDADES[0]);

  // Aplicado por efeito, e não só no clique: o `playbackRate` volta a 1 quando
  // o elemento recarrega a fonte, e a escolha ficaria valendo só na aparência.
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = velocidade;
  }, [velocidade, url]);

  // O `timeupdate` do elemento dispara só ~4x por segundo, e o preenchimento
  // avançaria aos saltos mesmo sendo contínuo. Enquanto toca, a posição é lida
  // a cada quadro; parado, o laço não roda e não custa nada.
  useEffect(() => {
    if (!tocando) return;

    let animacao: number;

    const acompanhar = () => {
      const el = audioRef.current;
      if (el) setPosicao(el.currentTime);
      animacao = requestAnimationFrame(acompanhar);
    };

    animacao = requestAnimationFrame(acompanhar);

    return () => cancelAnimationFrame(animacao);
  }, [tocando]);

  // A decodificação é cara e roda uma vez por mensagem. O `cancelado` evita
  // escrever estado depois que a conversa trocou - o áudio de um chat antigo
  // ainda estaria baixando quando outro abre.
  useEffect(() => {
    let cancelado = false;
    setCarregandoOnda(true);
    setOnda(null);

    const carregaOnda = async () => {
      try {
        const resposta = await fetch(url);
        const dados = await resposta.arrayBuffer();
        const contexto = new AudioContext();
        const buffer = await contexto.decodeAudioData(dados);

        if (!cancelado) setOnda(extraiOnda(buffer));

        await contexto.close();
      } catch {
        // Sem a onda o player continua servindo: as barras viram uma linha
        // plana e o resto funciona igual. Não vale alarmar quem atende.
      } finally {
        // No `finally` de propósito: se a decodificação falhar, o player
        // precisa liberar assim mesmo - senão o áudio fica travado para
        // sempre por causa do enfeite.
        if (!cancelado) setCarregandoOnda(false);
      }
    };

    carregaOnda();

    return () => {
      cancelado = true;
    };
  }, [url]);

  const alternar = () => {
    const el = audioRef.current;
    if (!el) return;

    if (el.paused) {
      el.play();
    } else {
      el.pause();
    }
  };

  /** Clique na onda salta para aquele ponto, como numa barra de progresso. */
  const irPara = (evento: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(el.duration)) return;

    const caixa = evento.currentTarget.getBoundingClientRect();
    const proporcao = (evento.clientX - caixa.left) / caixa.width;
    el.currentTime = Math.min(Math.max(proporcao, 0), 1) * el.duration;
  };

  // As duas esperas são independentes e ambas travam o play: a onda vem de um
  // `fetch` + `decodeAudioData` nosso, e a duração vem do próprio elemento.
  // Sem a segunda, clicar em play não tocava nada mesmo com a onda desenhada.
  const carregando = carregandoOnda || duracao <= 0;

  const progresso = duracao > 0 ? Math.min(posicao / duracao, 1) : 0;
  const barras = onda ?? new Array(TOTAL_BARRAS).fill(0.15);
  const corDaOnda = proprio ? '#fff' : 'var(--primary-color)';

  // A camada recortada precisa conhecer a largura total da faixa, que é
  // elástica: medida uma vez e mantida enquanto o player existe.
  const faixaRef = useRef<HTMLDivElement>(null);
  const [larguraDaOnda, setLarguraDaOnda] = useState<number | string>('100%');

  useEffect(() => {
    const el = faixaRef.current;
    if (!el) return;

    const medir = () => setLarguraDaOnda(el.offsetWidth);
    medir();

    // A bolha muda de largura quando a janela muda: sem reagir a isso, a onda
    // revelada descolaria da de baixo.
    const observador = new ResizeObserver(medir);
    observador.observe(el);

    return () => observador.disconnect();
  }, []);

  return (
    <div
      className="flex align-items-center gap-2 select-none"
      style={{ minWidth: 220 }}
    >
      <audio
        // Sem a `key`, trocar a prévia local pela URL do storage manteria o
        // elemento preso ao blob já revogado.
        key={url}
        ref={audioRef}
        preload="metadata"
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
        onEnded={() => {
          setTocando(false);
          setPosicao(0);
        }}
        // Enquanto toca, quem atualiza é o laço de quadros acima. Este cobre
        // o salto com o áudio parado, que não passa por lá.
        onTimeUpdate={(e) => {
          if (e.currentTarget.paused) setPosicao(e.currentTarget.currentTime);
        }}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          // Áudio gravado por MediaRecorder costuma chegar com duração
          // `Infinity` até alguém procurar o fim do arquivo.
          if (Number.isFinite(d)) setDuracao(d);
        }}
        onDurationChange={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d)) setDuracao(d);
        }}
      >
        <source
          src={url}
          type={mimetype}
        />
      </audio>

      <button
        type="button"
        onClick={alternar}
        disabled={carregando}
        title={carregando ? 'Carregando áudio...' : tocando ? 'Pausar' : 'Reproduzir'}
        className={`flex-none flex align-items-center justify-content-center border-circle border-none ${
          carregando ? 'cursor-default' : 'cursor-pointer'
        } ${proprio ? 'bg-white-alpha-30' : 'bg-primary'}`}
        // A opacidade em vez de cor apagada: o botão é redondo e colorido, e
        // trocar o fundo o faria sumir dentro da bolha de quem enviou.
        style={{ width: '2.25rem', height: '2.25rem', opacity: carregando ? 0.6 : 1 }}
      >
        {carregando ? (
          <i
            className="pi pi-spin pi-spinner text-primary-contrast"
            style={{ fontSize: '0.8rem' }}
          />
        ) : (
          <i
            // Acompanha a primária: nos modos escuros ela é clara, e o branco
            // fixo sumia dentro do botão.
            className={`fa-solid ${tocando ? 'fa-pause' : 'fa-play'} text-primary-contrast`}
            style={{ fontSize: '0.8rem', marginLeft: tocando ? 0 : 2 }}
          />
        )}
      </button>

      {/* Duas cópias da onda, uma sobre a outra: a apagada embaixo, a opaca
          por cima recortada em `progresso`. Antes cada barra acendia inteira
          ao ser cruzada, o que fazia o avanço andar em 40 degraus - o recorte
          por largura corta no meio da barra e preenche de forma contínua. */}
      <div
        ref={faixaRef}
        onClick={carregando ? undefined : irPara}
        className={`flex-1 relative ${carregando ? 'cursor-default' : 'cursor-pointer'}`}
        // Enquanto carrega, a onda achatada fica esmaecida - assim a faixa não
        // se apresenta como uma barra de progresso pronta para ser clicada.
        style={{ height: '2rem', opacity: carregando ? 0.45 : 1 }}
      >
        <Onda
          barras={barras}
          cor={corDaOnda}
          opacidade={0.35}
        />

        <div
          className="absolute top-0 left-0 h-full overflow-hidden"
          style={{ width: `${progresso * 100}%` }}
        >
          {/* Largura da faixa toda dentro do recorte: sem isto as barras se
              espremeriam conforme o corte avança, em vez de serem reveladas. */}
          <div
            className="h-full"
            style={{ width: larguraDaOnda }}
          >
            <Onda
              barras={barras}
              cor={corDaOnda}
              opacidade={1}
            />
          </div>
        </div>
      </div>

      <span
        className={`flex-none text-sm ${proprio ? 'text-primary-contrast' : 'text-600'}`}
        // A largura acompanha o corpo maior: apertada, "10:05" quebraria.
        style={{ fontVariantNumeric: 'tabular-nums', minWidth: '2.75rem' }}
      >
        {/* Traço enquanto carrega: "0:00" parado passa a impressão de um
            áudio vazio, e o que há é uma duração ainda desconhecida. */}
        {carregando ? '--:--' : tocando ? formataTempo(posicao) : formataTempo(duracao)}
      </span>

      <button
        type="button"
        onClick={() =>
          setVelocidade(
            (atual) => VELOCIDADES[(VELOCIDADES.indexOf(atual) + 1) % VELOCIDADES.length],
          )
        }
        title="Velocidade de reprodução"
        className={`flex-none border-none cursor-pointer border-round-2xl px-2 py-1 text-xs font-semibold ${
          proprio ? 'bg-white-alpha-30 text-primary-contrast' : 'bg-primary-100 text-primary-700'
        }`}
        // Largura fixa: "1.5x" é mais largo que "1x", e sem isto a onda
        // encolheria a cada troca.
        style={{ minWidth: '2.5rem' }}
      >
        {velocidade}x
      </button>
    </div>
  );
};

export default PlayerAudio;
