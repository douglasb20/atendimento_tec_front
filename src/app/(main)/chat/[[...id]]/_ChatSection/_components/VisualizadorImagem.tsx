'use client';

import { useRef, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';

type Props = { src: string; nome?: string; onFechar: () => void; onBaixar: () => void };

export default function VisualizadorImagem({ src, nome, onFechar, onBaixar }: Props) {
  const [zoom, setZoom] = useState(1);
  const [largura, setLargura] = useState(250);
  const [altura, setAltura] = useState(250);
  const [rotacao, setRotacao] = useState(0);
  const area = useRef<HTMLDivElement>(null);
  const arraste = useRef<{ x: number; y: number; esquerda: number; topo: number } | null>(null);
  const clique = useRef({ fundo: false, moveu: false });
  const girada = rotacao % 180 !== 0;
  const controle = (rotulo: string, icone: string, acao: () => void, desabilitado = false) => (
    <Button icon={`pi ${icone}`} aria-label={rotulo} title={rotulo} onClick={acao}
      disabled={desabilitado} text rounded className="visualizador-imagem-controle" />
  );

  return (
    <Dialog visible modal blockScroll onHide={onFechar} showHeader={false} dismissableMask
      aria-label={nome || 'Visualizador de imagem'} maskClassName="visualizador-imagem-mascara"
      maskStyle={{ background: 'rgba(0, 0, 0, 0.8)' }}
      style={{ width: '100vw', height: '100dvh', maxWidth: '100vw', maxHeight: '100dvh',
        margin: 0, border: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent' }}
      contentStyle={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0,
        padding: 0, borderRadius: 0, background: 'transparent' }}>
      <div className="visualizador-imagem-controles" onClick={evento => evento.stopPropagation()}>
        {controle('Baixar imagem', 'pi-download', onBaixar)}
        {controle('Girar para a direita', 'pi-refresh', () => setRotacao(valor => (valor + 90) % 360))}
        {controle('Girar para a esquerda', 'pi-undo', () => setRotacao(valor => (valor + 270) % 360))}
        {controle('Diminuir zoom', 'pi-search-minus', () => setZoom(valor => Math.max(0.25, valor - 0.25)), zoom <= 0.25)}
        {controle('Aumentar zoom', 'pi-search-plus', () => setZoom(valor => Math.min(4, valor + 0.25)), zoom >= 4)}
        {controle('Restaurar zoom', 'pi-arrows-alt', () => setZoom(1))}
        {controle('Fechar imagem', 'pi-times', onFechar)}
      </div>
      <div ref={area} style={{ flex: '1 1 0', minHeight: 0, overflow: 'auto', cursor: 'default', touchAction: 'none' }}
        onClick={evento => {
          if (!clique.current.fundo || clique.current.moveu) return;
          const limites = evento.currentTarget.getBoundingClientRect();
          // Clicar na barra de rolagem não equivale a clicar no fundo.
          if (evento.clientX >= limites.left + evento.currentTarget.clientWidth
            || evento.clientY >= limites.top + evento.currentTarget.clientHeight) return;
          onFechar();
        }}
        onPointerDown={evento => {
          if (evento.button !== 0) return;
          // A captura retargeta o click para a área, mesmo começando na imagem.
          // Guarda a origem antes dela para não fechar ao clicar na própria foto.
          clique.current = { fundo: !(evento.target as HTMLElement)?.closest?.('[data-visualizador-imagem]'), moveu: false };
          arraste.current = { x: evento.clientX, y: evento.clientY, esquerda: evento.currentTarget.scrollLeft, topo: evento.currentTarget.scrollTop };
          evento.currentTarget.setPointerCapture(evento.pointerId);
        }}
        onPointerMove={evento => {
          if (!arraste.current) return;
          if (Math.abs(evento.clientX - arraste.current.x) + Math.abs(evento.clientY - arraste.current.y) > 4) clique.current.moveu = true;
          evento.currentTarget.scrollLeft = arraste.current.esquerda - (evento.clientX - arraste.current.x);
          evento.currentTarget.scrollTop = arraste.current.topo - (evento.clientY - arraste.current.y);
        }}
        onPointerUp={() => { arraste.current = null; }}
        onPointerCancel={() => { arraste.current = null; clique.current = { fundo: false, moveu: false }; }}>
        <div style={{ display: 'grid', placeItems: 'center', width: 'max-content', minWidth: '100%', minHeight: '100%' }}>
          {/* A moldura acompanha os eixos da rotação, mantendo os quatro cantos roláveis. */}
          <div data-visualizador-imagem style={{ position: 'relative', width: (girada ? altura : largura) * zoom,
            height: (girada ? largura : altura) * zoom }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={nome || 'Imagem ampliada'} draggable={false}
            style={{ width: largura * zoom, height: altura * zoom, maxWidth: 'none', maxHeight: 'none', display: 'block', cursor: zoom > 1 ? 'grab' : 'default',
              position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) rotate(${rotacao}deg)` }}
            onLoad={evento => {
              const imagem = evento.currentTarget;
              const espaco = area.current;
              if (!espaco || !imagem.naturalWidth || !imagem.naturalHeight) return;
              const ajuste = Math.min(1, (espaco.clientWidth - 24) / imagem.naturalWidth, (espaco.clientHeight - 24) / imagem.naturalHeight);
              setLargura(Math.max(1, imagem.naturalWidth * ajuste));
              setAltura(Math.max(1, imagem.naturalHeight * ajuste));
            }} />
          </div>
        </div>
      </div>
    </Dialog>
  );
}
