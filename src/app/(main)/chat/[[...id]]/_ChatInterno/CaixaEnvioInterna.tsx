'use client';

import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react';
import { InputTextarea } from 'primereact/inputtextarea';
import { Menu } from 'primereact/menu';
import { MenuItem } from 'primereact/menuitem';
import { classNames } from 'primereact/utils';

import { EmojiClickData, EmojiStyle, Theme } from 'emoji-picker-react';

import { InternalMessageType } from '@/Interfaces';
import { Alerta } from '@/service/Util';
import { useGravacaoAudio } from '@/hooks/useGravacaoAudio';
import AudioComponent from '../_ChatSection/_components/AudioComponent';

// `emoji-picker-react` toca em `window` no import - com SSR o build quebra.
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

/** Mesmas medidas da caixa do atendimento, para as duas telas combinarem. */
const CLASSE_BOTAO =
  'border-none border-circle surface-hover text-600 cursor-pointer flex align-items-center justify-content-center flex-shrink-0 transition-colors transition-duration-150';
const ESTILO_BOTAO = { width: '2.25rem', height: '2.25rem', lineHeight: 1 } as const;

/** O que cada opção do menu de anexo aceita. */
const ACCEPT_POR_TIPO: Record<string, string> = {
  [InternalMessageType.DOCUMENT]: '*/*',
  [InternalMessageType.IMAGE]: 'image/*',
  [InternalMessageType.VIDEO]: 'video/*',
  [InternalMessageType.AUDIO]: 'audio/*',
};

/** Teto por arquivo. O mesmo do atendimento. */
const LIMITE_MB = 512;

export type ArquivoParaEnviar = {
  arquivo: File;
  tipo: InternalMessageType;
  legenda: string;
};

type Props = {
  onEnviarTexto: (texto: string) => void;
  onEnviarArquivo: (item: ArquivoParaEnviar) => void;
  onEnviarAudio: (arquivo: File) => void;
  desabilitado?: boolean;
};

/**
 * Caixa de envio do chat interno.
 *
 * Própria, e não o `SendMessageBox` do atendimento: aquele tem 900 linhas
 * carregando respostas rápidas, citação, seleção de mensagens e os quatro
 * estados de rodapé (finalizado, não assumido, de outro atendente), nada disso
 * existindo aqui. O que valia a pena reaproveitar - a gravação de voz - virou
 * `useGravacaoAudio`, e é chamado pelos dois.
 */
const CaixaEnvioInterna = ({
  onEnviarTexto,
  onEnviarArquivo,
  onEnviarAudio,
  desabilitado = false,
}: Props) => {
  const [texto, setTexto] = useState('');
  const [emojiAberto, setEmojiAberto] = useState(false);

  const campoRef = useRef<HTMLTextAreaElement>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const tipoAnexoRef = useRef<InternalMessageType>(InternalMessageType.DOCUMENT);
  const menuAnexoRef = useRef<Menu>(null);

  const gravacao = useGravacaoAudio();

  // O picker é ancorado no botão e renderizado em portal: dentro da janela
  // flutuante ele seria cortado pelo `overflow`.
  const { refs, floatingStyles } = useFloating({
    open: emojiAberto,
    onOpenChange: setEmojiAberto,
    placement: 'top-end',
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const enviarTexto = () => {
    const limpo = texto.trim();
    if (!limpo || desabilitado) return;

    onEnviarTexto(limpo);
    setTexto('');
  };

  /** Insere o emoji na posição do cursor, não no fim. */
  const inserirEmoji = (emoji: string) => {
    const campo = campoRef.current;

    if (!campo) {
      setTexto((atual) => atual + emoji);
      return;
    }

    const inicio = campo.selectionStart ?? texto.length;
    const fim = campo.selectionEnd ?? texto.length;

    setTexto(texto.slice(0, inicio) + emoji + texto.slice(fim));

    // Depois do render, senão a posição seria calculada sobre o texto antigo.
    requestAnimationFrame(() => {
      campo.focus();
      const cursor = inicio + emoji.length;
      campo.setSelectionRange(cursor, cursor);
    });
  };

  const abrirSeletor = (tipo: InternalMessageType) => {
    tipoAnexoRef.current = tipo;

    if (inputArquivoRef.current) {
      inputArquivoRef.current.accept = ACCEPT_POR_TIPO[tipo] ?? '*/*';
      inputArquivoRef.current.click();
    }
  };

  const aoEscolherArquivo = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const escolhidos = Array.from(evento.target.files ?? []);
    // Permite reescolher o mesmo arquivo depois de cancelar.
    evento.target.value = '';

    const grandes = escolhidos.filter((arquivo) => arquivo.size > LIMITE_MB * 1024 * 1024);

    if (grandes.length) {
      Alerta(
        `${grandes.map((a) => a.name).join(', ')} - o limite é ${LIMITE_MB} MB por arquivo.`,
        'Arquivo muito grande',
        'warning',
      );
    }

    escolhidos
      .filter((arquivo) => arquivo.size <= LIMITE_MB * 1024 * 1024)
      .forEach((arquivo) =>
        // A legenda vai no texto digitado, se houver: o chat interno não tem a
        // tela de revisão do atendimento, onde se escreve uma por arquivo.
        onEnviarArquivo({ arquivo, tipo: tipoAnexoRef.current, legenda: texto.trim() }),
      );

    setTexto('');
  };

  const enviarAudio = async () => {
    gravacao.setStatus('sending');

    const blob = await gravacao.parar();
    gravacao.cancelar();

    if (blob.size === 0) return;

    onEnviarAudio(new File([blob], 'audio_interno.ogg', { type: 'audio/ogg' }));
  };

  const opcoesAnexo: MenuItem[] = [
    {
      label: 'Documento',
      icon: 'fa-regular fa-file',
      command: () => abrirSeletor(InternalMessageType.DOCUMENT),
    },
    {
      label: 'Fotos',
      icon: 'fa-regular fa-image',
      command: () => abrirSeletor(InternalMessageType.IMAGE),
    },
    {
      label: 'Vídeos',
      icon: 'fa-regular fa-video',
      command: () => abrirSeletor(InternalMessageType.VIDEO),
    },
    {
      label: 'Áudio',
      icon: 'fa-regular fa-music',
      command: () => abrirSeletor(InternalMessageType.AUDIO),
    },
  ];

  // Gravando, a barra inteira dá lugar ao controle de áudio.
  if (gravacao.gravando || gravacao.status === 'sending') {
    return (
      <div className="border-top-1 surface-border px-2">
        <AudioComponent
          duration={gravacao.duracao}
          statusRecording={gravacao.status}
          stream={gravacao.stream}
          onPause={gravacao.pausar}
          onResume={gravacao.retomar}
          onCancel={gravacao.cancelar}
          onSendAudio={enviarAudio}
        />
      </div>
    );
  }

  return (
    <div className="border-top-1 surface-border p-2">
      <input
        ref={inputArquivoRef}
        type="file"
        multiple
        className="hidden"
        onChange={aoEscolherArquivo}
      />

      <Menu
        model={opcoesAnexo}
        popup
        ref={menuAnexoRef}
      />

      <div className="flex align-items-end gap-1">
        <button
          type="button"
          ref={refs.setReference}
          className={CLASSE_BOTAO}
          style={ESTILO_BOTAO}
          title="Emojis"
          disabled={desabilitado}
          onClick={() => setEmojiAberto((aberto) => !aberto)}
        >
          <i className="fa-regular fa-face-smile" />
        </button>

        <InputTextarea
          ref={campoRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            // Enter envia, Shift+Enter quebra linha - como no atendimento.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              enviarTexto();
            }
          }}
          autoResize
          rows={1}
          disabled={desabilitado}
          placeholder="Escreva uma mensagem"
          className="flex-1 border-round-2xl"
          style={{ maxHeight: '8rem', resize: 'none' }}
        />

        <button
          type="button"
          className={CLASSE_BOTAO}
          style={ESTILO_BOTAO}
          title="Anexar"
          disabled={desabilitado}
          onClick={(e) => menuAnexoRef.current?.toggle(e)}
        >
          <i className="fa-regular fa-plus" />
        </button>

        {/* O botão da direita é duplo: com texto envia, sem texto grava. */}
        <button
          type="button"
          className={classNames(CLASSE_BOTAO, 'text-white')}
          style={{ ...ESTILO_BOTAO, backgroundColor: 'var(--primary-color)' }}
          title={texto.trim() ? 'Enviar' : 'Gravar áudio'}
          disabled={desabilitado}
          onClick={() => (texto.trim() ? enviarTexto() : gravacao.iniciar())}
        >
          <i className={texto.trim() ? 'fa-solid fa-paper-plane' : 'fa-solid fa-microphone'} />
        </button>
      </div>

      {emojiAberto &&
        createPortal(
          <>
            {/* `onMouseDown`, não `onClick`: com click o backdrop fecharia o
                painel antes de o emoji registrar a escolha. */}
            <div
              className="fixed top-0 left-0 w-full h-full"
              style={{ zIndex: 99998 }}
              onMouseDown={() => setEmojiAberto(false)}
            />
            <div
              ref={refs.setFloating}
              style={{ ...floatingStyles, zIndex: 99999 }}
            >
              <EmojiPicker
                onEmojiClick={(dados: EmojiClickData) => {
                  inserirEmoji(dados.emoji);
                  setEmojiAberto(false);
                }}
                emojiStyle={EmojiStyle.NATIVE}
                theme={Theme.AUTO}
                searchPlaceHolder="Pesquisar"
                previewConfig={{ showPreview: false }}
                width={300}
                height={360}
                skinTonesDisabled
                lazyLoadEmojis
              />
            </div>
          </>,
          document.body,
        )}
    </div>
  );
};

export default CaixaEnvioInterna;
