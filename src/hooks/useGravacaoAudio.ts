'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Alerta } from '@/service/Util';

export type StatusGravacao = 'idle' | 'recording' | 'paused' | 'stopped' | 'sending';

/**
 * Gravação de áudio pelo microfone.
 *
 * Extraído de `SendMessageBox`, que o mantinha inline junto de tudo o que é
 * específico do atendimento (respostas rápidas, citação, os quatro estados de
 * rodapé). O chat interno precisa da mesma gravação e de mais nada daquilo.
 *
 * ⚠️ O `SendMessageBox` do atendimento **continua com a cópia dele** - migrá-lo
 * mexeria no caminho crítico do WhatsApp sem necessidade. Ao corrigir um bug de
 * gravação, olhe os dois.
 *
 * A duração é contada por relógio (`Date.now()`), não somando ticks: o
 * `setInterval` atrasa quando a aba perde o foco, e o contador derivaria do
 * tempo real do arquivo.
 */
export const useGravacaoAudio = () => {
  const [status, setStatus] = useState<StatusGravacao>('idle');
  const [duracao, setDuracao] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Quando o trecho atual começou - zera a cada retomada. */
  const inicioRef = useRef<number | null>(null);
  /** Segundos dos trechos já encerrados, para a pausa não perder o contado. */
  const acumuladoRef = useRef(0);

  const pararTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const iniciarTimer = useCallback(() => {
    intervalRef.current = setInterval(() => {
      if (!inicioRef.current) return;

      setDuracao(acumuladoRef.current + Math.floor((Date.now() - inicioRef.current) / 1000));
    }, 500);
  }, []);

  /** Solta o microfone - sem isso o indicador do navegador fica aceso. */
  const liberarMicrofone = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const iniciar = useCallback(async () => {
    try {
      const novoStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      streamRef.current = novoStream;
      setStream(novoStream);

      const recorder = new MediaRecorder(novoStream);
      mediaRecorderRef.current = recorder;

      chunksRef.current = [];
      acumuladoRef.current = 0;
      setDuracao(0);

      recorder.ondataavailable = (evento) => {
        if (evento.data.size > 0) chunksRef.current.push(evento.data);
      };

      recorder.onstart = () => {
        inicioRef.current = Date.now();
        iniciarTimer();
        setStatus('recording');
      };

      recorder.onpause = () => {
        pararTimer();
        acumuladoRef.current += Math.floor((Date.now() - (inicioRef.current ?? 0)) / 1000);
        setStatus('paused');
      };

      recorder.onresume = () => {
        inicioRef.current = Date.now();
        iniciarTimer();
        setStatus('recording');
      };

      recorder.start();
    } catch (erro) {
      console.error('ERRO AO ACESSAR MICROFONE:', erro);
      Alerta(
        'Verifique se o navegador tem permissão para usar o microfone.',
        'Não foi possível acessar o microfone',
        'warning',
      );
    }
  }, [iniciarTimer, pararTimer]);

  const pausar = useCallback(() => mediaRecorderRef.current?.pause(), []);
  const retomar = useCallback(() => mediaRecorderRef.current?.resume(), []);

  /**
   * Encerra e devolve o arquivo.
   *
   * ⚠️ Resolve com blob vazio quando não há gravador: sem isso o `await` de
   * quem chamou ficaria pendurado para sempre.
   */
  const parar = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;

      if (!recorder) return resolve(new Blob([], { type: 'audio/ogg' }));

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/ogg' });

        liberarMicrofone();
        resolve(blob);
      };

      recorder.stop();
    });
  }, [liberarMicrofone]);

  /** Descarta a gravação em curso. */
  const cancelar = useCallback(() => {
    setStatus('idle');
    setDuracao(0);

    // `stop()` num recorder já parado lança - e cancelar depois de enviar é
    // exatamente o caminho em que isso acontece.
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();

    liberarMicrofone();
    pararTimer();
  }, [liberarMicrofone, pararTimer]);

  // Desmontar no meio da gravação deixaria o microfone aberto e o timer
  // rodando sobre um componente que já não existe.
  useEffect(() => {
    return () => {
      pararTimer();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [pararTimer]);

  return {
    status,
    setStatus,
    duracao,
    stream,
    gravando: status === 'recording' || status === 'paused',
    iniciar,
    pausar,
    retomar,
    parar,
    cancelar,
  };
};
