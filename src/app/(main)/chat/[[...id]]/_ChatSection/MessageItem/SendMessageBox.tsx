'use client';
import React, { useRef, useState } from 'react';
import { InputTextarea } from 'primereact/inputtextarea';
import { Menu } from 'primereact/menu';
import { MenuItem } from 'primereact/menuitem';
import { useForm, Controller } from 'react-hook-form';

import { parseCookies } from 'nookies';

import useApi from '@/service/Api/ApiClient';
import { useChatStore } from '@/store/useChatStore';
import { useOutboxStore } from '@/store/useOutboxStore';
import { processarItem, registrarArquivo } from '@/service/Outbox';
import { ehAtendimentoFinalizado, ModeQuoted, SupportChatStatusId, UserInfo } from '@/Interfaces';
import { Alerta } from '@/service/Util';

import QuotedMessage from '../_components/QuotedMessage';
import PreviewAnexos, { AnexoSelecionado } from '../_components/PreviewAnexos';
import AudioComponent from '../_components/AudioComponent';
import { classNames } from 'primereact/utils';

/**
 * Nome do atendente para a bolha provisória, lido do cookie `userInfo`.
 *
 * Devolve string vazia quando o cookie não existe, está expirado ou veio sem o
 * campo - casos reais, já que ele é re-hidratado pelo middleware. Quem usa não
 * pode montar o prefixo `*Nome:*` sem checar, sob pena de exibir um ":" solto.
 */
const nomeDoAtendente = (): string => {
  try {
    const cru = parseCookies()['userInfo'];
    return cru ? ((JSON.parse(cru) as UserInfo).name ?? '') : '';
  } catch {
    return '';
  }
};

/** Tipos de anexo aceitos, no mesmo vocabulário que o backend espera. */
type TipoAnexo = 'document' | 'image' | 'video' | 'audio';

const ACCEPT_POR_TIPO: Record<TipoAnexo, string> = {
  // Sem restrição: o WhatsApp aceita qualquer arquivo como documento, e num
  // atendimento técnico aparece de tudo - .dwg, .log, .apk, .rar. Limitar a
  // uma lista de escritório só atrapalharia.
  document: '*/*',
  image: 'image/*',
  video: 'video/*',
  audio: 'audio/*',
};

/**
 * Teto do protocolo do WhatsApp, não o do WhatsApp Web: o Baileys fala o
 * protocolo direto, sem o limite de 16MB que o navegador impõe - foi um dos
 * motivos de trocar de engine. Um envio de 187MB já foi validado aqui; o valor
 * serve para barrar antes de subir ao storage, não para espelhar a interface
 * oficial.
 */
const LIMITE_MB = 512;

export default function SendMessageBox() {
  const { FetchReq } = useApi();
  const activeChat = useChatStore((s) => s.activeChat);
  const quoted = useChatStore((s) => s.quoted);
  const setQuotedMessage = useChatStore((s) => s.setQuotedMessage);
  const enfileirar = useOutboxStore((s) => s.enfileirar);
  const { control, handleSubmit, reset, watch } = useForm<{ messageText: string }>({
    defaultValues: { messageText: '' },
  });
  const [statusRecording, setStatusRecording] = useState<
    'idle' | 'recording' | 'paused' | 'stopped' | 'sending'
  >('idle');
  const [duration, setDuration] = useState(0); // em segundos
  const [anexos, setAnexos] = useState<AnexoSelecionado[]>([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0); // tempo já gravado

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const menuAnexoRef = useRef<Menu>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tipoAnexoRef = useRef<TipoAnexo>('document');

  const handleSendMessage = (field: { messageText: string }) => {
    const texto = field.messageText.trim();
    if (!texto) return;

    const ehResposta = Boolean(quoted?.message && quoted.mode === ModeQuoted.REPLY);

    // O backend prefixa o texto com o nome do atendente; repetir aqui evita que
    // a bolha mude de conteúdo quando a mensagem definitiva chegar.
    const autor = nomeDoAtendente();

    const item = {
      id: `envio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      supportChatId: String(activeChat?.id),
      chatId: activeChat?.contact?.remote_jid,
      // Instante do envio: é o que define a posição na conversa, mesmo que a
      // confirmação demore.
      enviadoEm: new Date().toISOString(),
      tipo: 'texto' as const,
      conteudo: texto,
      autor,
      ...(ehResposta && { quotedMessageId: quoted.message.message_id }),
    };

    // Enfileira e devolve o controle na hora: o envio corre fora do componente,
    // então trocar de conversa não o interrompe.
    enfileirar(item);
    processarItem({ ...item, status: 'pendente', tentativas: 0 }, FetchReq);

    reset();
    setQuotedMessage(null, null);
  };

  const startRecording = async () => {
    try {
      console.log('Iniciando gravação de áudio...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      chunksRef.current = [];
      accumulatedRef.current = 0;

      setDuration(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstart = () => {
        startedAtRef.current = Date.now();
        startTimer();
        setStatusRecording('recording');
      };

      mediaRecorder.onpause = () => {
        stopTimer();
        accumulatedRef.current += Math.floor((Date.now() - (startedAtRef.current ?? 0)) / 1000);
        setStatusRecording('paused');
      };
      mediaRecorder.onresume = () => {
        startedAtRef.current = Date.now();
        startTimer();
        setStatusRecording('recording');
      };
      // mediaRecorder.onstop = () => {
      //   stopTimer();
      //   if (startedAtRef.current) {
      //     accumulatedRef.current += Math.floor((Date.now() - startedAtRef.current) / 1000);
      //   }
      //   setDuration(accumulatedRef.current);
      //   setStatusRecording('stopped');
      // };

      mediaRecorder.start();
    } catch (err) {
      console.error('ERRO AO ACESSAR MICROFONE:', err);
      alert('Não foi possível acessar o microfone');
    }
  };

  const startTimer = () => {
    intervalRef.current = setInterval(() => {
      if (!startedAtRef.current) return;

      const seconds =
        accumulatedRef.current + Math.floor((Date.now() - startedAtRef.current) / 1000);

      setDuration(seconds);
    }, 500);
  };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const stopRecording = (): Promise<Blob> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) return;

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: 'audio/ogg',
        });

        streamRef.current?.getTracks().forEach((t) => t.stop());
        resolve(blob);
      };

      recorder.stop();
    });
  };

  const onCancel = (status: 'idle' | 'recording' | 'paused' | 'stopped' | 'sending' = 'idle') => {
    setStatusRecording(status);
    setDuration(0);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    stopTimer();
  };

  const onSendAudio = async () => {
    const audioBlob = await stopRecording();
    onCancel('idle');

    const arquivo = new File([audioBlob], 'audio_message.ogg', { type: 'audio/ogg' });
    const ehResposta = Boolean(quoted?.message && quoted.mode === ModeQuoted.REPLY);
    const autor = nomeDoAtendente();

    const item = {
      id: `envio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      supportChatId: String(activeChat?.id),
      chatId: activeChat?.contact?.remote_jid,
      enviadoEm: new Date().toISOString(),
      tipo: 'voz' as const,
      conteudo: '',
      autor,
      mediaType: 'audio/ogg',
      // Toca o arquivo local enquanto o upload não termina.
      previewUrl: URL.createObjectURL(arquivo),
      ...(ehResposta && { quotedMessageId: quoted.message.message_id }),
    };

    // O File fica fora da store: não sobreviveria à serialização em JSON.
    registrarArquivo(item.id, arquivo);
    enfileirar(item);
    processarItem({ ...item, status: 'pendente', tentativas: 0 }, FetchReq);

    setQuotedMessage(null, null);
  };

  /** Abre o seletor de arquivos com o filtro do tipo escolhido no menu. */
  const abrirSeletor = (tipo: TipoAnexo) => {
    tipoAnexoRef.current = tipo;
    if (fileInputRef.current) {
      fileInputRef.current.accept = ACCEPT_POR_TIPO[tipo];
      fileInputRef.current.value = ''; // permite reescolher o mesmo arquivo
      fileInputRef.current.click();
    }
  };

  /**
   * A seleção **não** envia: abre a tela de revisão. Enviar é irreversível
   * assim que chega ao provider, então o atendente confere antes.
   */
  const onSelecionarArquivo = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const selecionados = Array.from(evento.target.files ?? []);
    if (!selecionados.length) return;

    const excedentes = selecionados.filter((a) => a.size > LIMITE_MB * 1024 * 1024);
    const aceitos = selecionados.filter((a) => a.size <= LIMITE_MB * 1024 * 1024);

    if (excedentes.length) {
      Alerta(
        `${excedentes.map((a) => a.name).join(', ')} - acima do limite de ${LIMITE_MB}MB.`,
        excedentes.length > 1 ? 'Arquivos muito grandes' : 'Arquivo muito grande',
      );
    }
    if (!aceitos.length) return;

    // Acrescenta aos já escolhidos: o botão "+" da revisão reabre este seletor.
    setAnexos((atuais) => [
      ...atuais,
      ...aceitos.map((arquivo, indice) => ({
        id: `anexo-${Date.now()}-${indice}-${Math.random().toString(36).slice(2, 8)}`,
        arquivo,
        previewUrl: URL.createObjectURL(arquivo),
      })),
    ]);
  };

  /** Libera os blobs da revisão - sem isto ficam retidos na memória da aba. */
  const descartarAnexos = (lista: AnexoSelecionado[]) =>
    lista.forEach((a) => URL.revokeObjectURL(a.previewUrl));

  const onRemoverAnexo = (id: string) =>
    setAnexos((atuais) => {
      const removido = atuais.find((a) => a.id === id);
      if (removido) URL.revokeObjectURL(removido.previewUrl);
      return atuais.filter((a) => a.id !== id);
    });

  const onCancelarAnexos = () => {
    descartarAnexos(anexos);
    setAnexos([]);
  };

  /** Confirmada a revisão, cada arquivo vira um item da fila de envio. */
  const onEnviarAnexos = (legendas: Record<string, string>) => {
    const tipo = tipoAnexoRef.current;
    const ehResposta = Boolean(quoted?.message && quoted.mode === ModeQuoted.REPLY);
    const autor = nomeDoAtendente();
    const agora = Date.now();

    anexos.forEach(({ id: idAnexo, arquivo }, indice) => {
      const item = {
        id: `envio-${agora}-${indice}-${Math.random().toString(36).slice(2, 8)}`,
        supportChatId: String(activeChat?.id),
        chatId: activeChat?.contact?.remote_jid,
        // O deslocamento por índice mantém a ordem de seleção na conversa: sem
        // ele, arquivos escolhidos juntos teriam o mesmo instante de envio e a
        // ordenação ficaria indefinida.
        enviadoEm: new Date(agora + indice).toISOString(),
        tipo: 'midia' as const,
        // Cada arquivo leva a legenda que foi escrita para ele na revisão.
        conteudo: (legendas[idAnexo] ?? '').trim(),
        autor,
        mediaType: tipo,
        mimetype: arquivo.type,
        fileName: arquivo.name,
        previewUrl: URL.createObjectURL(arquivo),
        ...(ehResposta && indice === 0 && { quotedMessageId: quoted.message.message_id }),
      };

      registrarArquivo(item.id, arquivo);
      enfileirar(item);
      // A corrente da conversa os envia um a um, na ordem de seleção.
      processarItem({ ...item, status: 'pendente', tentativas: 0 }, FetchReq);
    });

    descartarAnexos(anexos);
    setAnexos([]);
    setQuotedMessage(null, null);
  };

  const menuAnexos: MenuItem[] = [
    {
      label: 'Documento',
      icon: 'fa-regular fa-file-lines',
      command: () => abrirSeletor('document'),
    },
    {
      label: 'Fotos',
      icon: 'fa-regular fa-image',
      command: () => abrirSeletor('image'),
    },
    {
      label: 'Vídeos',
      icon: 'fa-regular fa-video',
      command: () => abrirSeletor('video'),
    },
    {
      label: 'Áudio',
      icon: 'fa-regular fa-music',
      command: () => abrirSeletor('audio'),
    },
  ];

  const finalizado = ehAtendimentoFinalizado(activeChat?.support_chat_status_id);
  const naoAssumido =
    !finalizado &&
    (activeChat?.support_chat_status_id === SupportChatStatusId.AGUARDANDO ||
      activeChat?.support_chat_status_id === SupportChatStatusId.EM_FILA);

  // Sem alguém responsável não há o que registrar: o `answered_at` nasce do
  // botão Iniciar, e responder antes disso deixaria o atendimento sem dono e
  // sem tempo contado.
  if (naoAssumido || finalizado) {
    return (
      <div className="flex align-items-center justify-content-center gap-2 border-1 border-300 surface-100 border-round-lg p-3 mt-2 text-600">
        <i className={`fa-regular ${finalizado ? 'fa-circle-check' : 'fa-lock'}`} />
        <span className="text-sm">
          {finalizado
            ? 'Atendimento finalizado - este histórico é somente leitura.'
            : 'Inicie o atendimento para responder.'}
        </span>
      </div>
    );
  }

  return (
    <>
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={onSelecionarArquivo}
        className="hidden"
      />

      {anexos.length > 0 && (
        <PreviewAnexos
          anexos={anexos}
          tipo={tipoAnexoRef.current}
          onRemover={onRemoverAnexo}
          onAdicionar={() => abrirSeletor(tipoAnexoRef.current)}
          onCancelar={onCancelarAnexos}
          onEnviar={onEnviarAnexos}
        />
      )}

      <div
        className={classNames(
          { hidden: anexos.length > 0 },
          'flex flex-column border-1 border-300 surface-border border-round-lg bg-white dark:bg-gray-700 px-2 mt-2',
        )}
      >
        <QuotedMessage />
        {statusRecording !== 'idle' && anexos.length === 0 && (
          <AudioComponent
            onSendAudio={onSendAudio}
            duration={duration}
            onPause={() => mediaRecorderRef?.current?.pause()}
            onResume={() => mediaRecorderRef?.current?.resume()}
            onCancel={() => onCancel()}
            statusRecording={statusRecording}
            stream={streamRef.current}
          />
        )}
        {statusRecording === 'idle' && anexos.length === 0 && (
          <div className="flex flex-row w-full p-fluid gap-2 py-1">
            <Menu
              ref={menuAnexoRef}
              model={menuAnexos}
              popupAlignment="left"
              popup
            />
            <button
              type="button"
              aria-label="Anexar arquivo"
              onClick={(e) => menuAnexoRef.current?.toggle(e)}
              className="flex cursor-pointer justify-content-center align-items-center w-3rem h-3rem align-self-end border-circle border-1 border-primary bg-transparent hover:bg-primary-50 flex-shrink-0"
            >
              <i className="text-xl fa-regular fa-paperclip text-primary" />
            </button>
            <Controller
              control={control}
              name="messageText"
              render={({ field }) => (
                <InputTextarea
                  autoResize
                  onKeyDown={(e) => {
                    // Verifica se a tecla é 'Enter' E se a tecla Shift NÃO está pressionada.
                    if (e.key === 'Enter' && !e.shiftKey) {
                      // 1. Previne o comportamento padrão do Enter (que é criar uma nova linha).
                      e.preventDefault();
                      // 2. Chama a função para enviar a mensagem.
                      handleSubmit(handleSendMessage)();
                    }
                    // Se for Shift + Enter, o código dentro do 'if' não roda,
                    // e o comportamento padrão (criar nova linha) acontece normalmente.
                  }}
                  // `readOnly` em vez de `disabled`: mantém o foco no campo, então
                  // o atendente volta a digitar assim que o envio termina, sem
                  // precisar clicar de novo. O `p-disabled` dá a aparência de
                  // desabilitado, com o mesmo tratamento do resto do PrimeReact.
                  className="w-full max-h-10rem shadow-none border-none"
                  placeholder="Digite sua mensagem..."
                  rows={1}
                  value={field.value}
                  onChange={field.onChange}
                  ref={field.ref}
                />
              )}
            />
            <button
              className={classNames(
                {
                  'border-none bg-primary-500 hover:bg-primary-600 ':
                    watch('messageText')?.trim() !== '',
                  'border-1 border-primary bg-transparent hover:bg-primary-50 ':
                    watch('messageText')?.trim() === '',
                },
                'flex cursor-pointer justify-content-center align-items-center w-3rem h-3rem align-self-end border-circle ',
              )}
              onClick={async () => {
                if (watch('messageText')?.trim() === '') {
                  // Lógica para gravação de áudio pode ser implementada aqui
                  startRecording();
                } else {
                  handleSubmit(handleSendMessage)();
                }
              }}
            >
              <i
                className={classNames(
                  {
                    'fa-microphone text-primary': watch('messageText')?.trim() === '',
                    'fa-send text-white': watch('messageText')?.trim() !== '',
                  },
                  'text-xl fa-regular ',
                )}
              />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
