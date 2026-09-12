import { useEffect, useRef } from 'react';

/**
 * Onda sonora da gravação em curso, como a do WhatsApp Web.
 *
 * Desenha em `<canvas>` - não em elementos do DOM - porque a barra é redesenhada
 * ~60x por segundo: um nó por barra faria o React reconciliar centenas de
 * elementos a cada quadro, e a gravação inteira competiria com a UI.
 *
 * O volume vem do `AnalyserNode`, que a Web Audio API alimenta direto do stream
 * do microfone; nada disso passa pelo MediaRecorder, então a análise não
 * interfere no arquivo gravado.
 */
type OndaGravacaoProps = {
  /** O mesmo stream que o MediaRecorder está usando. */
  stream: MediaStream | null;
  /** Pausado congela a onda no lugar, sem zerá-la. */
  pausado: boolean;
};

/** Largura de cada barra e do vão entre elas, em pixels. */
const LARGURA_BARRA = 3;
const ESPACO_BARRA = 2;

const OndaGravacao = ({ stream, pausado }: OndaGravacaoProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** Histórico de volumes: o mais recente entra à direita, como no WhatsApp. */
  const volumesRef = useRef<number[]>([]);
  const pausadoRef = useRef(pausado);

  // Um ref em vez de dependência do efeito: pausar não deve recriar o
  // AudioContext nem perder a onda já desenhada.
  useEffect(() => {
    pausadoRef.current = pausado;
  }, [pausado]);

  useEffect(() => {
    if (!stream) return;

    const contexto = new AudioContext();
    const analisador = contexto.createAnalyser();
    // 256 dá 128 amostras por quadro - resolução de sobra para medir volume,
    // e barato o suficiente para rodar a cada frame.
    analisador.fftSize = 256;

    const origem = contexto.createMediaStreamSource(stream);
    origem.connect(analisador);

    const amostras = new Uint8Array(analisador.frequencyBinCount);
    let animacao: number;

    const desenhar = () => {
      animacao = requestAnimationFrame(desenhar);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // O canvas precisa acompanhar o tamanho em CSS, senão a imagem estica.
      const largura = canvas.clientWidth;
      const altura = canvas.clientHeight;
      if (canvas.width !== largura || canvas.height !== altura) {
        canvas.width = largura;
        canvas.height = altura;
      }

      if (!pausadoRef.current) {
        analisador.getByteTimeDomainData(amostras);

        // Desvio médio em relação ao silêncio (128) - mede o quanto o sinal se
        // afasta do repouso, que é o que se percebe como "volume".
        let soma = 0;
        for (let i = 0; i < amostras.length; i++) soma += Math.abs(amostras[i] - 128);
        const volume = Math.min(1, soma / amostras.length / 40);

        volumesRef.current.push(volume);

        // Guarda só o que cabe na tela; o resto sai pela esquerda.
        const maximo = Math.ceil(largura / (LARGURA_BARRA + ESPACO_BARRA));
        if (volumesRef.current.length > maximo) {
          volumesRef.current = volumesRef.current.slice(-maximo);
        }
      }

      ctx.clearRect(0, 0, largura, altura);

      const cor = getComputedStyle(canvas).getPropertyValue('--primary-color')?.trim() || '#6366f1';
      ctx.fillStyle = cor;

      // Desenha da direita para a esquerda: o som de agora fica junto ao
      // cursor, e o histórico corre para trás.
      volumesRef.current.forEach((volume, indice) => {
        const doFim = volumesRef.current.length - 1 - indice;
        const x = largura - (doFim + 1) * (LARGURA_BARRA + ESPACO_BARRA);
        if (x < 0) return;

        // Mínimo de 2px para o silêncio virar uma linha, não um vão.
        const alturaBarra = Math.max(2, volume * altura);
        const y = (altura - alturaBarra) / 2;

        // `roundRect` é recente; sem ele a barra sai reta, o que é aceitável.
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(x, y, LARGURA_BARRA, alturaBarra, LARGURA_BARRA / 2);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, LARGURA_BARRA, alturaBarra);
        }
      });
    };

    desenhar();

    return () => {
      cancelAnimationFrame(animacao);
      origem.disconnect();
      // Sem fechar, cada gravação deixaria um AudioContext vivo - o navegador
      // limita quantos podem existir por página.
      contexto.close().catch(() => undefined);
    };
  }, [stream]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-2rem"
      aria-hidden="true"
    />
  );
};

export default OndaGravacao;
