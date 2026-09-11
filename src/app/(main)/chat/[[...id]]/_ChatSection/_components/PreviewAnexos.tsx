'use client';

import { useEffect, useRef, useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { classNames } from 'primereact/utils';

export type AnexoSelecionado = {
  /** Chave local da lista, para o React e para remover o item. */
  id: string;
  arquivo: File;
  /** `blob:` da sessão atual, usado só nesta tela. */
  previewUrl: string;
};

type PreviewAnexosProps = {
  anexos: AnexoSelecionado[];
  tipo: 'document' | 'image' | 'video' | 'audio';
  onRemover: (id: string) => void;
  onAdicionar: () => void;
  onCancelar: () => void;
  onEnviar: (legenda: string) => void;
};

const formataTamanho = (bytes: number) => {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/**
 * Revisão dos arquivos antes do envio, no formato do WhatsApp Web: um em
 * destaque, os demais em miniaturas, e a legenda aplicada ao conjunto.
 *
 * A tela existe para dar chance de conferir e desistir — selecionar um arquivo
 * não deve disparar o envio, que é irreversível assim que chega ao provider.
 */
const PreviewAnexos = ({
  anexos,
  tipo,
  onRemover,
  onAdicionar,
  onCancelar,
  onEnviar,
}: PreviewAnexosProps) => {
  const [ativo, setAtivo] = useState(0);
  const [legenda, setLegenda] = useState('');
  const legendaRef = useRef<HTMLInputElement>(null);

  // Remover o último da lista deixaria o índice fora da faixa.
  useEffect(() => {
    if (ativo > anexos.length - 1) setAtivo(Math.max(0, anexos.length - 1));
  }, [anexos.length, ativo]);

  useEffect(() => {
    legendaRef.current?.focus();
  }, []);

  const emDestaque = anexos[ativo];
  if (!emDestaque) return null;

  const renderizaDestaque = () => {
    if (tipo === 'image') {
      return (
        <img
          src={emDestaque.previewUrl}
          alt={emDestaque.arquivo.name}
          className="max-w-full max-h-full border-round"
          style={{ objectFit: 'contain' }}
        />
      );
    }

    if (tipo === 'video') {
      return (
        <video
          src={emDestaque.previewUrl}
          controls
          className="max-w-full max-h-full border-round"
        />
      );
    }

    if (tipo === 'audio') {
      return (
        <audio
          src={emDestaque.previewUrl}
          controls
          className="w-full"
        />
      );
    }

    return (
      <div className="flex flex-column align-items-center gap-2 py-5">
        <i className="fa-regular fa-file-lines text-6xl text-primary" />
        <span className="font-medium">{emDestaque.arquivo.name}</span>
      </div>
    );
  };

  return (
    // Sobrepõe o painel inteiro, em vez de empurrar a conversa para cima: a
    // revisão é um passo à parte, e espremer o histórico atrapalha a leitura.
    <div className="absolute top-0 left-0 w-full h-full z-5 flex flex-column surface-0 border-round">
      <div className="flex justify-content-between align-items-center px-3 py-2 border-bottom-1 surface-border">
        <span className="font-medium">
          {anexos.length === 1 ? '1 arquivo' : `${anexos.length} arquivos`}
        </span>
        <button
          type="button"
          aria-label="Cancelar envio"
          onClick={onCancelar}
          className="flex cursor-pointer justify-content-center align-items-center w-2rem h-2rem border-circle border-none bg-transparent hover:surface-200"
        >
          <i className="fa-regular fa-xmark text-lg" />
        </button>
      </div>

      {/* O destaque ocupa o espaço livre; a faixa e a legenda ficam fixas. */}
      <div className="flex flex-1 justify-content-center align-items-center overflow-hidden p-3">
        {renderizaDestaque()}
      </div>

      <div className="flex align-items-center gap-2 overflow-x-auto px-3 pb-2">
        {anexos.map((anexo, indice) => (
          <div
            key={anexo.id}
            className="relative flex-shrink-0"
          >
            <button
              type="button"
              onClick={() => setAtivo(indice)}
              className={classNames(
                {
                  'border-primary border-2': indice === ativo,
                  'border-300 border-1': indice !== ativo,
                },
                'flex cursor-pointer flex-column justify-content-center align-items-center w-4rem h-4rem border-round surface-100 overflow-hidden p-0',
              )}
            >
              {tipo === 'image' || tipo === 'video' ? (
                <MiniaturaVisual
                  anexo={anexo}
                  tipo={tipo}
                />
              ) : (
                <i
                  className={classNames(
                    tipo === 'audio' ? 'fa-music' : 'fa-file-lines',
                    'fa-regular text-2xl text-primary',
                  )}
                />
              )}
            </button>
            <span
              className="absolute left-0 bottom-0 w-full text-center text-white"
              style={{ fontSize: '0.55rem', background: 'rgba(0,0,0,.55)' }}
            >
              {formataTamanho(anexo.arquivo.size)}
            </span>
            <button
              type="button"
              aria-label={`Remover ${anexo.arquivo.name}`}
              onClick={() => onRemover(anexo.id)}
              className="absolute flex cursor-pointer justify-content-center align-items-center w-1rem h-1rem border-circle border-none bg-red-500 text-white"
              style={{ top: '-0.25rem', right: '-0.25rem', fontSize: '0.6rem' }}
            >
              <i className="fa-regular fa-xmark" />
            </button>
          </div>
        ))}

        <button
          type="button"
          aria-label="Adicionar arquivo"
          onClick={onAdicionar}
          className="flex cursor-pointer flex-shrink-0 justify-content-center align-items-center w-4rem h-4rem border-round border-1 border-300 border-dashed surface-0 hover:surface-100"
        >
          <i className="fa-regular fa-plus text-xl text-600" />
        </button>
      </div>

      <div className="flex align-items-center gap-2 p-3 border-top-1 surface-border">
        <InputText
          ref={legendaRef}
          value={legenda}
          onChange={(e) => setLegenda(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onEnviar(legenda);
            }
          }}
          placeholder="Adicione uma legenda..."
          className="w-full shadow-none"
        />
        <button
          type="button"
          aria-label="Enviar"
          onClick={() => onEnviar(legenda)}
          className="flex cursor-pointer justify-content-center align-items-center w-3rem h-3rem border-circle border-none bg-primary-500 hover:bg-primary-600 flex-shrink-0"
        >
          <i className="fa-regular fa-send text-white text-xl" />
        </button>
      </div>
    </div>
  );
};

/** Miniatura de imagem/vídeo; o vídeo usa o próprio elemento como quadro. */
const MiniaturaVisual = ({ anexo, tipo }: { anexo: AnexoSelecionado; tipo: 'image' | 'video' }) =>
  tipo === 'image' ? (
    <img
      src={anexo.previewUrl}
      alt=""
      className="w-full h-full"
      style={{ objectFit: 'cover' }}
    />
  ) : (
    <video
      src={anexo.previewUrl}
      className="w-full h-full"
      style={{ objectFit: 'cover' }}
      muted
    />
  );

export default PreviewAnexos;
