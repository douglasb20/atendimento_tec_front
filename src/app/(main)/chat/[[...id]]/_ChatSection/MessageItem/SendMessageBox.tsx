'use client';
import React, { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react';
import { EmojiClickData, EmojiStyle, Theme } from 'emoji-picker-react';
import { InputTextarea } from 'primereact/inputtextarea';
import { Menu } from 'primereact/menu';
import { MenuItem } from 'primereact/menuitem';
import { useForm, Controller, useWatch } from 'react-hook-form';

import { parseCookies } from 'nookies';

import useApi from '@/service/Api/ApiClient';
import { useChatStore } from '@/store/useChatStore';
import { useOutboxStore } from '@/store/useOutboxStore';
import { processarItem, registrarArquivo } from '@/service/Outbox';
import {
  ehAtendimentoAtivo,
  ehAtendimentoFinalizado,
  ModeQuoted,
  podeAgirNoAtendimento,
  UserInfo,
} from '@/Interfaces';
import { Alerta, CatchAlerta, nomeCompleto } from '@/service/Util';
import { useUsuarioLogado } from '@/hooks/useUsuarioLogado';
import { useRespostasRapidas } from '@/hooks/useRespostasRapidas';
import { useSalvarRespostaRapida } from '@/hooks/useSalvarRespostaRapida';
import { QuickReplyForm, QuickReplyResponse } from '@/Interfaces';
import ModalFormResposta from '@/app/(main)/atendimentos/respostas-rapidas/_DadosRespostasSection/ModalFormResposta';
import ListaRespostasRapidas from '../_components/ListaRespostasRapidas';

/** `emoji-picker-react` toca em `window` no import; sem `ssr: false` quebra o build. */
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

/**
 * Os botões redondos da barra: anexo, respostas rápidas e emoji.
 *
 * Numa constante para que a próxima mudança de tamanho ou cor não precise
 * acertar três lugares - foi assim que eles chegaram a 3rem enquanto o campo
 * ao lado encolhia.
 *
 * O alinhamento vertical vem do contêiner (`align-items-center`), não daqui.
 */
const CLASSE_BOTAO_BARRA =
  'flex cursor-pointer justify-content-center align-items-center border-circle border-1 border-primary bg-transparent hover:bg-primary-50 flex-shrink-0';

/**
 * `line-height: 1` centra o glifo no círculo; sem ele o ícone monta alto.
 *
 * ⚠️ **Sem margem negativa.** Houve aqui um `marginBottom: -0.25rem` para
 * cancelar o `py-1` do contêiner quando o campo tinha uma linha só - mas ele
 * vale sempre, e com o textarea crescido empurrava os botões para fora da
 * caixa. O alinhamento é problema do contêiner, não de cada botão.
 */
const ESTILO_BOTAO_BARRA = {
  width: '2.5rem',
  height: '2.5rem',
  lineHeight: 1,
};

import QuotedMessage from '../_components/QuotedMessage';
import PreviewAnexos, { AnexoSelecionado } from '../_components/PreviewAnexos';
import AudioComponent from '../_components/AudioComponent';
import { classNames } from 'primereact/utils';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';

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
  const { usuarioId, carregado } = useUsuarioLogado();
  const { control, handleSubmit, reset, setValue } = useForm<{ messageText: string }>({
    defaultValues: { messageText: '' },
  });
  // `useWatch` em vez de `watch()` no corpo: este re-renderizava o componente
  // inteiro a cada tecla, levando junto o menu de anexos e a revisão. O hook
  // isola a assinatura, e um único booleano substitui as quatro leituras.
  const temTexto = Boolean(useWatch({ control, name: 'messageText' })?.trim());
  const [statusRecording, setStatusRecording] = useState<
    'idle' | 'recording' | 'paused' | 'stopped' | 'sending'
  >('idle');
  const [duration, setDuration] = useState(0); // em segundos
  const [anexos, setAnexos] = useState<AnexoSelecionado[]>([]);
  // Legenda pré-preenchida quando o anexo vem de uma resposta rápida - o
  // texto da resposta vira a legenda da mídia, não algo solto na caixa.
  const [legendasIniciais, setLegendasIniciais] = useState<Record<string, string>>({});
  // A cópia server-side (`PrepararAnexoRespostaRapida`) roda em paralelo ao
  // preview, não antes dele - só é aguardada na hora do envio, quando o
  // resultado (a `mediaKey` definitiva) de fato precisa existir.
  const copiasEmAndamentoRef = useRef<Record<string, Promise<string>>>({});

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0); // tempo já gravado

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Respostas rápidas: a lista abre ao digitar `/` no início de uma palavra.
  const { filtrar, resolveVariaveis, recarregar } = useRespostasRapidas(activeChat);
  const { salvar: salvarRespostaRapida } = useSalvarRespostaRapida();
  // O rodapé da lista de atalhos só aparece para quem pode cadastrar.
  const { podeAdicionar: podeAdicionarResposta } = usePermissoesModulo('quick.reply');
  const [modalRespostaVisivel, setModalRespostaVisivel] = useState(false);

  // Emoji: o picker vai para um portal no `body`, como no `EditorMensagem` - a
  // caixa de mensagem tem recorte arredondado e o cortaria por dentro.
  const [emojiAberto, setEmojiAberto] = useState(false);
  const { refs, floatingStyles } = useFloating({
    open: emojiAberto,
    placement: 'top-start',
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const campoRef = useRef<HTMLTextAreaElement>(null);
  const caixaRef = useRef<HTMLDivElement>(null);
  const [buscaAtalho, setBuscaAtalho] = useState<string | null>(null);
  const [indiceAtivo, setIndiceAtivo] = useState(0);

  // `null` distingue "fechada" de "aberta sem filtro": a busca vazia logo após
  // o `/` deve mostrar tudo.
  const listaAberta = buscaAtalho !== null;
  const respostasFiltradas = listaAberta ? filtrar(buscaAtalho) : [];

  const fecharLista = () => {
    setBuscaAtalho(null);
    setIndiceAtivo(0);
  };

  /**
   * Cadastra a resposta e devolve o atendente à conversa com a lista atualizada.
   *
   * A lista flutuante fecha ao abrir o modal: as duas camadas disputariam o
   * clique, e a lista fica por cima de tudo (`zIndex` 99999).
   */
  const salvarRespostaDoChat = async (
    fields: QuickReplyForm,
    arquivoNovo: File | null,
    removeuAnexo: boolean,
  ) => {
    try {
      await salvarRespostaRapida(fields, arquivoNovo, removeuAnexo);
      setModalRespostaVisivel(false);
      await recarregar();
      Alerta('Resposta rápida salva com sucesso!', 'Sucesso', 'success');
    } catch (err) {
      // Atalho repetido volta 409 com mensagem própria.
      CatchAlerta(err, 'Erro ao salvar a resposta rápida');
    }
  };

  const menuAnexoRef = useRef<Menu>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tipoAnexoRef = useRef<TipoAnexo>('document');

  /**
   * O token `/algo` imediatamente antes do cursor, se houver.
   *
   * A barra só conta como **primeiro caractere da mensagem**. Aceitá-la depois
   * de qualquer espaço fazia a lista pular na cara de quem escreve texto
   * normal - uma data (`vence 10/05`), uma URL colada, um `e/ou`. Uma resposta
   * rápida substitui a mensagem inteira, então não há caso real de invocá-la
   * no meio de um texto já digitado.
   *
   * O token termina no espaço: `/bom dia` deixa de ser atalho ali, que é onde
   * o atendente passou a escrever texto normal.
   */
  const tokenAntesDoCursor = (texto: string, cursor: number) => {
    const ateCursor = texto.slice(0, cursor);
    const casou = /^\/([\w.-]*)$/.exec(ateCursor);

    if (!casou) return null;

    return { termo: casou[1], inicio: 0 };
  };

  /** Reavalia a lista a cada tecla e a cada clique que mova o cursor. */
  const avaliaAtalho = (texto: string, cursor: number) => {
    const token = tokenAntesDoCursor(texto, cursor);

    if (!token) {
      if (buscaAtalho !== null) fecharLista();
      return;
    }

    setBuscaAtalho(token.termo);
    setIndiceAtivo(0);
  };

  /**
   * Escreve o emoji onde o cursor está e devolve o foco ao campo.
   *
   * O foco é o detalhe que faz a barra ser utilizável: sem ele, o clique no
   * botão tira o cursor do textarea e o emoji seguinte cairia no fim do texto.
   */
  const inserirEmoji = (emoji: string) => {
    const campo = campoRef.current;
    const textoAtual = campo?.value ?? '';
    const inicio = campo?.selectionStart ?? textoAtual.length;
    const fim = campo?.selectionEnd ?? textoAtual.length;

    const novoTexto = textoAtual.slice(0, inicio) + emoji + textoAtual.slice(fim);
    setValue('messageText', novoTexto, { shouldDirty: true });

    // Depois do render: mexer na seleção antes dele seria desfeito pelo React.
    requestAnimationFrame(() => {
      campo?.focus();
      const posicao = inicio + emoji.length;
      campo?.setSelectionRange(posicao, posicao);
    });
  };

  /**
   * Sem anexo: põe o texto na caixa, com as variáveis resolvidas.
   * **Substitui a mensagem inteira**, não só o `/atalho`. Pelo `/` o campo tem
   * apenas o atalho mesmo (é o primeiro caractere, e o token vai até o
   * cursor), então dá no mesmo; pelo botão da barra, enxertar a resposta no
   * meio do que já estava escrito produzia frases emendadas. Uma resposta
   * rápida é a mensagem, não um pedaço dela.
   *
   * Com anexo: a mídia entra na revisão (`PreviewAnexos`), com o texto como
   * legenda - o mesmo caminho de conferência de um anexo escolhido à mão,
   * em vez de enviar direto. Nada vai para a caixa de mensagem neste caso.
   */
  const inserirResposta = async (resposta: QuickReplyResponse) => {
    fecharLista();

    if (resposta.anexo_key) {
      // O texto vira legenda na revisão, não fica na caixa - mas o `/atalho`
      // que disparou a lista precisa sair de lá, senão fica pendurado depois
      // que a revisão fecha (pelo Enter ou por "Cancelar").
      setValue('messageText', '', { shouldDirty: true });
      await abrirRevisaoDaResposta(resposta);
      return;
    }

    const campo = campoRef.current;
    const texto = resolveVariaveis(resposta.mensagem);

    setValue('messageText', texto, { shouldDirty: true });

    // Depois do render: mexer na seleção antes dele seria desfeito pelo React.
    requestAnimationFrame(() => {
      campo?.focus();
      campo?.setSelectionRange(texto.length, texto.length);
    });
  };

  /**
   * Abre a revisão na hora, baixando o binário direto do `anexo_url` do
   * cadastro (já disponível na listagem, sem custo de cópia). A cópia
   * server-side (`PrepararAnexoRespostaRapida`) roda **em paralelo**, e só é
   * aguardada em `onEnviarAnexos` - antes esperávamos a cópia terminar só
   * para então baixar o mesmo arquivo de volta, dobrando a espera para o
   * preview aparecer.
   */
  const abrirRevisaoDaResposta = async (resposta: QuickReplyResponse) => {
    try {
      if (!resposta.anexo_url) throw new Error('Resposta sem URL de anexo');

      const binario = await fetch(resposta.anexo_url).then((r) => r.blob());
      const arquivo = new File([binario], resposta.anexo_nome ?? 'arquivo', {
        type: resposta.anexo_mimetype ?? binario.type,
      });

      const id = `anexo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      tipoAnexoRef.current = resposta.anexo_tipo ?? 'document';
      setLegendasIniciais({ [id]: resolveVariaveis(resposta.mensagem) });
      copiasEmAndamentoRef.current[id] = FetchReq<{ media_key: string }>({
        endpoint: 'PrepararAnexoRespostaRapida',
        variables: [resposta.id],
      }).then((copia) => copia.media_key);
      setAnexos((atuais) => [
        ...atuais,
        { id, arquivo, previewUrl: URL.createObjectURL(arquivo) },
      ]);
    } catch (erro) {
      Alerta('Não foi possível anexar o arquivo da resposta rápida.', 'Aviso', 'warning');
    }
  };

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
      Alerta(
        'Verifique se o navegador tem permissão para usar o microfone.',
        'Não foi possível acessar o microfone',
        'warning',
      );
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
      // Sem `resolve` aqui o `await` de quem chamou ficava pendurado para
      // sempre; um blob vazio deixa o fluxo terminar e nada é enviado.
      if (!recorder) return resolve(new Blob([], { type: 'audio/ogg' }));

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
   * Comum a "escolher arquivo" e "colar imagem": valida tamanho e acrescenta
   * à revisão. **Não envia** - abre a tela de revisão; enviar é irreversível
   * assim que chega ao provider, então o atendente confere antes.
   */
  const adicionarArquivos = (selecionados: File[]) => {
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

    // Acrescenta aos já escolhidos: o botão "+" da revisão reabre o seletor.
    setAnexos((atuais) => [
      ...atuais,
      ...aceitos.map((arquivo, indice) => ({
        id: `anexo-${Date.now()}-${indice}-${Math.random().toString(36).slice(2, 8)}`,
        arquivo,
        previewUrl: URL.createObjectURL(arquivo),
      })),
    ]);
  };

  const onSelecionarArquivo = (evento: React.ChangeEvent<HTMLInputElement>) => {
    adicionarArquivos(Array.from(evento.target.files ?? []));
  };

  /**
   * Cola uma imagem do clipboard direto na revisão, como o WhatsApp Web
   * oficial - sem isto, colar um print vira só o campo de texto sem reação
   * (o navegador não tem o que fazer com uma imagem num `<textarea>`).
   *
   * Só imagem: é o único tipo que a área de transferência do sistema carrega
   * como arquivo pronto (documento/vídeo não têm esse caminho no clipboard).
   * Texto colado continua indo para a caixa normalmente - `items` traz os
   * dois tipos juntos quando a origem oferece ambos, e aqui só filtramos o
   * que é imagem.
   */
  const onColarImagem = (evento: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imagens = Array.from(evento.clipboardData?.items ?? [])
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((arquivo): arquivo is File => arquivo !== null);

    if (!imagens.length) return;

    // Preveni o comportamento padrão só quando há imagem - colar texto
    // continua funcionando normalmente no campo.
    evento.preventDefault();
    tipoAnexoRef.current = 'image';
    adicionarArquivos(imagens);
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
    setLegendasIniciais({});
    copiasEmAndamentoRef.current = {};
  };

  /**
   * Confirmada a revisão, cada arquivo vira um item da fila de envio.
   *
   * Anexo de resposta rápida: aguarda aqui a cópia server-side que já estava
   * rodando em paralelo desde a abertura do preview (`abrirRevisaoDaResposta`)
   * - na prática já deve estar pronta, o tempo de revisão/legenda é maior que
   * o de copiar um arquivo no storage.
   */
  const onEnviarAnexos = async (legendas: Record<string, string>) => {
    const tipo = tipoAnexoRef.current;
    const ehResposta = Boolean(quoted?.message && quoted.mode === ModeQuoted.REPLY);
    const autor = nomeDoAtendente();
    const agora = Date.now();
    const anexosParaEnviar = anexos;
    const copiasParaEnviar = copiasEmAndamentoRef.current;

    // Sai da revisão na hora - não faz sentido travar a tela esperando a
    // cópia, que provavelmente já terminou.
    descartarAnexos(anexos);
    setAnexos([]);
    setLegendasIniciais({});
    copiasEmAndamentoRef.current = {};
    setQuotedMessage(null, null);

    for (let indice = 0; indice < anexosParaEnviar.length; indice++) {
      const { id: idAnexo, arquivo } = anexosParaEnviar[indice];
      // A key pronta faz o Outbox pular o upload (`subirArquivo` devolve na
      // hora quando `mediaKey` já vem preenchida).
      let mediaKeyPronta: string | undefined;
      try {
        mediaKeyPronta = await copiasParaEnviar[idAnexo];
      } catch {
        // Cópia falhou: segue como upload normal, sem key pronta.
      }

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
        ...(mediaKeyPronta && { mediaKey: mediaKeyPronta }),
        ...(ehResposta && indice === 0 && { quotedMessageId: quoted.message.message_id }),
      };

      registrarArquivo(item.id, arquivo);
      enfileirar(item);
      // A corrente da conversa os envia um a um, na ordem de seleção.
      processarItem({ ...item, status: 'pendente', tentativas: 0 }, FetchReq);
    }
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
  const naoAssumido = !finalizado && !ehAtendimentoAtivo(activeChat?.support_chat_status_id);
  // `podeAgirNoAtendimento` é a mesma regra usada pela reação e pelo menu de
  // mensagem: uma só definição de "posso escrever nesta conversa".
  const deOutroAtendente =
    !finalizado && !naoAssumido && !podeAgirNoAtendimento(activeChat, usuarioId);

  // Enquanto o cookie não foi lido, `usuarioId` é nulo e todo atendimento
  // pareceria alheio - o rodapé piscaria bloqueado para o próprio dono.
  if (!carregado && !finalizado && !naoAssumido) return null;

  // Sem alguém responsável não há o que registrar: o `answered_at` nasce do
  // botão Iniciar, e responder antes disso deixaria o atendimento sem dono e
  // sem tempo contado. Já com outro dono, escrever faria o cliente ouvir duas
  // vozes no mesmo atendimento.
  if (naoAssumido || finalizado || deOutroAtendente) {
    const icone = finalizado ? 'fa-circle-check' : deOutroAtendente ? 'fa-eye' : 'fa-lock';

    return (
      <div className="flex align-items-center justify-content-center gap-2 border-1 border-300 surface-100 border-round-lg p-3 mt-2 text-600">
        <i className={`fa-regular ${icone}`} />
        <span className="text-sm">
          {finalizado
            ? 'Atendimento finalizado - este histórico é somente leitura.'
            : deOutroAtendente
              ? `Atendimento de ${nomeCompleto(activeChat?.user) || 'outro atendente'} - somente leitura.`
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
          legendasIniciais={legendasIniciais}
        />
      )}

      <div
        className={classNames(
          { hidden: anexos.length > 0 },
          // `surface-0`: o `bg-white dark:bg-gray-700` era sintaxe do Tailwind, que
          // este projeto não usa - o `dark:` nunca valeu, e sobrava o branco fixo.
          'flex flex-column border-1 border-300 surface-border border-round-lg surface-0 px-2 mt-2',
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
          <div
            ref={caixaRef}
            // `align-items-center`: os botões ficam centrados em relação ao
            // campo, que é como a barra sempre foi. Alinhá-los à base os
            // deixava colados na borda de baixo da caixa.
            //
            // ⚠️ Nada de margem negativa nos botões: houve aqui um
            // `marginBottom: -0.25rem` para compensar um `py-1` do contêiner, e
            // com o textarea crescido ele os empurrava para fora da caixa.
            className="flex flex-row w-full p-fluid gap-2 align-items-center"
          >
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
              className={CLASSE_BOTAO_BARRA}
              style={ESTILO_BOTAO_BARRA}
            >
              <i className="text-lg fa-regular fa-paperclip text-primary" />
            </button>

            {/* Para quem não conhece o `/`: abre a mesma lista, sem filtro. */}
            <button
              type="button"
              aria-label="Respostas rápidas"
              title="Respostas rápidas"
              onClick={() => {
                if (listaAberta) {
                  fecharLista();
                  return;
                }
                setBuscaAtalho('');
                setIndiceAtivo(0);
                campoRef.current?.focus();
              }}
              className={CLASSE_BOTAO_BARRA}
              style={ESTILO_BOTAO_BARRA}
            >
              <i className="text-lg fa-regular fa-bolt text-primary" />
            </button>

            {/* Âncora do picker: `refs.setReference` no próprio botão faz o
                floating-ui posicioná-lo acima, que é onde há espaço - a caixa
                de mensagem fica no rodapé da tela. */}
            <button
              ref={refs.setReference}
              type="button"
              aria-label="Emojis"
              title="Emojis"
              onClick={() => setEmojiAberto((aberto) => !aberto)}
              className={CLASSE_BOTAO_BARRA}
              style={ESTILO_BOTAO_BARRA}
            >
              <i className="text-lg fa-regular fa-face-smile text-primary" />
            </button>
            <Controller
              control={control}
              name="messageText"
              render={({ field }) => (
                <InputTextarea
                  autoResize
                  onKeyDown={(e) => {
                    // ⚠️ A lista de respostas rápidas vem **antes** do Enter que
                    // envia: com ela aberta, Enter escolhe o item destacado.
                    // Sem esta precedência, escolher uma resposta mandaria a
                    // conversa pela metade.
                    if (listaAberta && respostasFiltradas.length) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setIndiceAtivo((i) => (i + 1) % respostasFiltradas.length);
                        return;
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setIndiceAtivo(
                          (i) => (i - 1 + respostasFiltradas.length) % respostasFiltradas.length,
                        );
                        return;
                      }
                      if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Tab') {
                        e.preventDefault();
                        inserirResposta(respostasFiltradas[indiceAtivo]);
                        return;
                      }
                    }

                    // Esc fecha a lista sem inserir. O `stopPropagation` evita
                    // que o mesmo Esc feche a conversa, que é o atalho global.
                    if (e.key === 'Escape' && listaAberta) {
                      e.preventDefault();
                      e.stopPropagation();
                      fecharLista();
                      return;
                    }

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
                  onPaste={onColarImagem}
                  className="w-full max-h-10rem shadow-none border-none"
                  placeholder="Digite sua mensagem..."
                  rows={1}
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e);
                    avaliaAtalho(e.target.value, e.target.selectionStart ?? 0);
                  }}
                  // Clicar noutro ponto do texto pode tirar o cursor de um
                  // `/atalho`, ou colocá-lo dentro de um: a lista reage a isso.
                  onClick={(e) => {
                    const alvo = e.currentTarget;
                    avaliaAtalho(alvo.value, alvo.selectionStart ?? 0);
                  }}
                  // A ref do RHF e a nossa: ele precisa dela para o foco em
                  // erro de validação, nós para mexer na seleção.
                  ref={(el) => {
                    field.ref(el);
                    campoRef.current = el;
                  }}
                />
              )}
            />
            <button
              className={classNames(
                {
                  'border-none bg-primary-500 hover:bg-primary-600 ': temTexto,
                  'border-1 border-primary bg-transparent hover:bg-primary-50 ': !temTexto,
                },
                // ⚠️ `flex-shrink-0`: sem ele o flex comprime o botão na
                // horizontal e o círculo vira uma elipse.
                //
                // As classes são escritas aqui, e não vindas de
                // `CLASSE_BOTAO_BARRA`: aquela crava `border-1 border-primary`,
                // e este botão troca a borda conforme haja texto (vira sólido
                // ao enviar). Só o tamanho é compartilhado.
                'flex cursor-pointer justify-content-center align-items-center border-circle flex-shrink-0',
              )}
              style={ESTILO_BOTAO_BARRA}
              // Campo vazio grava áudio; com texto, envia.
              onClick={() => (temTexto ? handleSubmit(handleSendMessage)() : startRecording())}
            >
              <i
                className={classNames(
                  {
                    'fa-microphone text-primary': !temTexto,
                    // O fundo é `bg-primary-500`, que nos modos escuros é
                    // claro - o branco sumia dentro do botão.
                    'fa-send text-primary-contrast': temTexto,
                  },
                  'text-xl fa-regular ',
                )}
              />
            </button>
          </div>
        )}
      </div>

      {/* Ancorada na caixa de mensagem, em portal: o `border-round-lg` dela
          recorta o que transborda, e a lista ficaria cortada por dentro. */}
      <ListaRespostasRapidas
        aberta={listaAberta}
        respostas={respostasFiltradas}
        indiceAtivo={indiceAtivo}
        ancora={caixaRef.current}
        onEscolher={inserirResposta}
        onFechar={fecharLista}
        podeAdicionar={podeAdicionarResposta}
        onAdicionar={() => {
          fecharLista();
          setModalRespostaVisivel(true);
        }}
      />

      <ModalFormResposta
        visible={modalRespostaVisivel}
        onHide={() => setModalRespostaVisivel(false)}
        data={null}
        onConfirm={salvarRespostaDoChat}
      />

      {emojiAberto &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            {/* `mousedown` e não `click`: o clique no emoji dispara depois, e
                com `click` esta camada fecharia o picker antes da escolha. */}
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
                width={320}
                height={380}
                // ⚠️ Sem seletor de tom de pele: o histórico de recentes da
                // biblioteca não distingue as variações, e escolher um tom
                // embaralha a lista de usados.
                skinTonesDisabled
                lazyLoadEmojis
              />
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
