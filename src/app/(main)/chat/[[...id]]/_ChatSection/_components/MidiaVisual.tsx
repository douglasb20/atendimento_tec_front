'use client';

import { useState } from 'react';
import { ProgressSpinner } from 'primereact/progressspinner';

import VideoGif from './VideoGif';
import VisualizadorImagem from './VisualizadorImagem';

type Props = {
  src: string;
  tipo: 'image' | 'video';
  mimetype?: string;
  nome?: string;
  gif?: boolean;
  enviando?: boolean;
  onAbrirVideo: () => void;
  onBaixar: () => void;
};

/** Reserva a largura antes de conhecer as dimensões do arquivo recebido. */
export default function MidiaVisual({ src, tipo, mimetype, nome, gif, enviando, onAbrirVideo, onBaixar }: Props) {
  const [ampliada, setAmpliada] = useState(false);
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>('carregando');
  const [tentativa, setTentativa] = useState(0);
  const [proporcao, setProporcao] = useState(tipo === 'image' ? 1 : 16 / 9);
  const pronta = () => setEstado('pronto');
  const falhou = () => setEstado('erro');
  const metadados = (evento: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = evento.currentTarget;
    if (video.videoWidth && video.videoHeight) setProporcao(video.videoWidth / video.videoHeight);
  };

  return (
    <div className="relative mb-2 border-round overflow-hidden surface-100"
      style={{ width: `min(${gif ? 380 : 250}px, 60vw)`, maxWidth: '100%', aspectRatio: proporcao,
        maxHeight: tipo === 'image' ? 250 : gif ? 640 : 370 }} aria-busy={estado === 'carregando'}>
      <div className="w-full h-full" style={{ visibility: estado === 'pronto' ? 'visible' : 'hidden' }}>
        {tipo === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={tentativa} src={src} alt={nome ?? 'Imagem'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onLoad={pronta} onError={falhou} />
        ) : gif ? (
          <VideoGif key={tentativa} src={src} type={mimetype}
            onLoadedData={pronta} onLoadedMetadata={metadados} onError={falhou} />
        ) : (
          <video key={tentativa} src={src} preload="metadata" playsInline controls={false}
            className="w-full h-full pointer-events-none" style={{ objectFit: 'contain' }}
            onLoadedMetadata={metadados} onLoadedData={pronta} onError={falhou} />
        )}
      </div>

      {estado === 'carregando' && !enviando && (
        <div role="status" className="absolute top-0 left-0 w-full h-full flex flex-column align-items-center justify-content-center gap-2">
          <ProgressSpinner style={{ width: '2rem', height: '2rem' }} strokeWidth="4" />
          <span className="text-sm">Carregando {tipo === 'image' ? 'imagem' : 'vídeo'}...</span>
        </div>
      )}
      {estado === 'erro' && (
        <div role="alert" className="absolute top-0 left-0 w-full h-full flex flex-column align-items-center justify-content-center gap-2 p-2 text-center">
          <span className="text-sm">Não foi possível carregar {tipo === 'image' ? 'a imagem' : 'o vídeo'}.</span>
          <button type="button" className="border-none bg-transparent text-primary cursor-pointer underline"
            onClick={() => { setEstado('carregando'); setTentativa(valor => valor + 1); }}>Tentar novamente</button>
        </div>
      )}
      {tipo === 'video' && !gif && !enviando && estado === 'pronto' && (
        <button type="button" aria-label="Reproduzir vídeo" onClick={onAbrirVideo}
          className="absolute top-0 left-0 w-full h-full border-none bg-transparent cursor-pointer flex align-items-center justify-content-center">
          <i className="fa-light fa-circle-play text-6xl text-white" />
        </button>
      )}
      {tipo === 'image' && estado === 'pronto' && (
        <button type="button" aria-label="Ampliar imagem" onClick={() => setAmpliada(true)}
          className="absolute top-0 left-0 w-full h-full border-none bg-transparent cursor-pointer" />
      )}
      {ampliada && <VisualizadorImagem src={src} nome={nome} onFechar={() => setAmpliada(false)} onBaixar={onBaixar} />}
    </div>
  );
}
