'use client';

import { useRef, useState } from 'react';

type VideoGifProps = {
  src: string;
  type?: string;
};

/** Quantas vezes o GIF repete antes de parar e mostrar o botão. */
const REPETICOES = 2;

/**
 * GIF do WhatsApp (vídeo curto em loop): toca `REPETICOES` vezes e para, com o
 * botão "GIF" no centro - clicar toca de novo. Como o WhatsApp oficial; um loop
 * infinito por mensagem, com a conversa cheia deles, distrai e consome CPU.
 *
 * Sem o atributo `loop`: as voltas são contadas no `ended`.
 */
const VideoGif = ({ src, type }: VideoGifProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const voltas = useRef(0);
  const [parado, setParado] = useState(false);

  const aoTerminar = () => {
    voltas.current += 1;

    if (voltas.current >= REPETICOES) {
      // Volta ao primeiro quadro: parado no fim ele mostrava o último, que em
      // muito GIF é escuro/vazio. O WhatsApp exibe o início como prévia.
      if (videoRef.current) videoRef.current.currentTime = 0;
      setParado(true);
      return;
    }

    videoRef.current?.play().catch(() => {});
  };

  const tocarDeNovo = () => {
    voltas.current = 0;
    setParado(false);
    videoRef.current?.play().catch(() => {});
  };

  return (
    <>
      <video
        // Trocar o src de um <source> não recarrega o vídeo; a `key` força.
        key={src}
        ref={videoRef}
        controls={false}
        className="w-full h-full pointer-events-none"
        autoPlay
        muted
        playsInline
        onEnded={aoTerminar}
        style={{ objectFit: 'fill' }}
      >
        <source
          src={src}
          type={type}
        />
        Seu navegador não suporta o elemento de vídeo.
      </video>

      {parado && (
        <div
          className="absolute top-0 left-0 w-full h-full flex align-items-center justify-content-center cursor-pointer"
          onClick={tocarDeNovo}
          role="button"
          aria-label="Reproduzir GIF"
        >
          <span
            className="flex align-items-center justify-content-center border-circle text-white font-bold"
            style={{ width: '3.5rem', height: '3.5rem', background: 'rgba(0, 0, 0, 0.5)' }}
          >
            GIF
          </span>
        </div>
      )}
    </>
  );
};

export default VideoGif;
