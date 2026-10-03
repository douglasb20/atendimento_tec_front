import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { isEqual, parseISO, startOfDay } from 'date-fns';
import { Image } from 'primereact/image';
import { ProgressSpinner } from 'primereact/progressspinner';
import { classNames } from 'primereact/utils';

import Interweave from '@/components/Interweave';
import { SupportChatMessageResponse, SupportChatsResponse } from '@/Interfaces';
import { DateToBR, fixHeartEmoji } from '@/service/Util';
import { lerContatosCompartilhados } from '@/service/Vcard';
import { useChatStore } from '@/store/useChatStore';
import { jaAnimou, marcaComoAnimada } from '@/service/Outbox/jaAnimadas';
import { useAjustesAtendimento } from '@/hooks/useAjustesAtendimento';
import QuotedMessageItem from './QuotedMessageItem';
import VideoGif from './VideoGif';
import PlayerAudio from './PlayerAudio';
import ModalContatoCompartilhado from './ModalContatoCompartilhado';

type SingleMessageComponentProps = {
  message: SupportChatMessageResponse;
  doAnimation: boolean;
  isLast: boolean;
  activeChat: SupportChatsResponse;
  /** Mensagem citada, já resolvida pela lista - evita buscá-la aqui. */
  quotedMessage?: SupportChatMessageResponse;
};

const ArrumaData = (data: string) => {
  const hoje = startOfDay(new Date());
  const dataMsg = startOfDay(parseISO(data));

  if (isEqual(hoje, dataMsg)) {
    return DateToBR(data, 'HH:mm');
  } else {
    return DateToBR(data, 'dd/MM/yyyy HH:mm');
  }
};

const ProccessAck = (ack: number) => {
  switch (ack) {
    case 0:
      return 'fa-clock';
    case 1:
      return 'fa-check';
    case 2:
      return 'fa-check-double';
    case 3:
      return 'fa-check-double text-blue-500';
    default:
      return 'fa-clock';
  }
};

/** Ícone por extensão - dá ao anexo a mesma pista visual do explorador. */
const iconeDocumento = (fileName?: string) => {
  const ext = fileName?.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'pdf') return 'fa-regular fa-file-pdf';
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) return 'fa-regular fa-file-word';
  if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) return 'fa-regular fa-file-excel';
  if (['ppt', 'pptx', 'odp'].includes(ext)) return 'fa-regular fa-file-powerpoint';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'fa-regular fa-file-zipper';
  if (['txt', 'log', 'md'].includes(ext)) return 'fa-regular fa-file-lines';
  if (['json', 'xml', 'html', 'ts', 'js', 'sql'].includes(ext)) return 'fa-regular fa-file-code';

  return 'fa-regular fa-file';
};

/** Tamanho legível; `null` é comum em mensagem que o provider não informou. */
const formataTamanhoArquivo = (bytes?: number | null) => {
  if (!bytes) return 'Documento';
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/**
 * Cobre a mídia com o progresso enquanto o arquivo sobe.
 *
 * Declarado fora do componente de propósito: definido dentro, o React o trata
 * como um tipo novo a cada render e desmonta a árvore - o vídeo piscava e o
 * quadro reajustava a cada porcentagem.
 */
const ComProgresso = ({
  progresso,
  children,
}: {
  progresso?: number;
  children: React.ReactNode;
}) => {
  if (progresso === undefined) return <>{children}</>;

  return (
    <div className="relative">
      {children}
      <div
        className="absolute top-0 left-0 w-full h-full flex flex-column align-items-center justify-content-center gap-2 border-round"
        style={{ background: 'rgba(0,0,0,.45)' }}
      >
        <ProgressSpinner
          className="w-3rem h-3rem"
          strokeWidth="4"
        />
        {/* Passado o upload, o arquivo ainda percorre provider e WhatsApp:
            manter "100%" daria a impressão de travado. */}
        <span className="text-white text-sm font-medium">
          {progresso < 100 ? `${progresso}%` : 'Finalizando'}
        </span>
      </div>
    </div>
  );
};

const SingleMessageComponent = ({
  message,
  doAnimation,
  isLast,
  activeChat,
  quotedMessage,
}: SingleMessageComponentProps) => {
  const { from_me, content } = message;
  // Só a ação, nunca a lista: assinar `messages` aqui faria cada bolha
  // re-renderizar a cada mensagem nova da conversa.
  const setVideoPreview = useChatStore((s) => s.setVideoPreview);
  const { ajustes } = useAjustesAtendimento();

  // Apagada e com o conteúdo exibido: borda vermelha na bolha inteira e ícone
  // no rodapé - mais visível numa lista longa que só o ícone pequeno sozinho.
  const apagadaComConteudo = message.is_deleted && ajustes.mostrar_conteudo_mensagem_apagada;

  const InterpretedContent = useMemo(() => fixHeartEmoji(content), [content]);

  // Contato compartilhado: o conteúdo é o JSON cru dos vCards, ilegível como
  // texto. Lista vazia (formato desconhecido) cai de volta no texto da bolha.
  const [contatoAberto, setContatoAberto] = useState(false);
  const contatosCompartilhados = useMemo(
    () =>
      message.type === 'vcard' || message.type === 'multi_vcard'
        ? lerContatosCompartilhados(content)
        : [],
    [message.type, content],
  );

  // Localização: a primeira linha do conteúdo são as coordenadas; nome e
  // endereço, quando há, vêm nas seguintes. Conteúdo fora desse formato (nome
  // solto, de mensagens antigas) cai de volta no texto da bolha.
  const localizacao = useMemo(() => {
    if (message.type !== 'location') return null;

    const [coordenadas, nome, endereco] = (content ?? '').split('\n');
    const [lat, lng] = (coordenadas ?? '').split(',').map((v) => Number(v));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !coordenadas?.includes(',')) return null;

    return {
      coordenadas,
      nome: nome || null,
      endereco: endereco || null,
      url: `https://www.google.com/maps?q=${lat},${lng}`,
    };
  }, [message.type, content]);

  // Chave Pix: o conteúdo é o JSON montado pelo back. Fora desse formato cai
  // de volta no texto da bolha.
  const pix = useMemo(() => {
    if (message.type !== 'payment') return null;
    try {
      const dados = JSON.parse(content ?? '');
      return dados?.key
        ? (dados as {
            merchant_name: string | null;
            key: string;
            key_type: string | null;
            valor: number | null;
          })
        : null;
    } catch {
      return null;
    }
  }, [message.type, content]);
  const [pixCopiado, setPixCopiado] = useState(false);

  const copiarPix = async () => {
    try {
      await navigator.clipboard.writeText(pix.key);
      setPixCopiado(true);
      setTimeout(() => setPixCopiado(false), 2000);
    } catch {}
  };

  /**
   * Anima **uma vez** por mensagem, e só na que acabou de chegar.
   *
   * Três coisas precisam ser verdade, e cada uma resolve um jeito diferente de
   * a animação sair errada:
   *
   * - `doAnimation` - a mensagem não estava na tela quando a conversa abriu.
   *   Sem isso o histórico inteiro desfilaria a cada abertura.
   * - `isLast` - só a última bolha entra; as de cima já estão posicionadas.
   * - o registro de já animadas - a última bolha volta a renderizar a cada ack
   *   (enviado → entregue → lido), reação e edição, e sem este controle a
   *   classe era reaplicada sobre o mesmo nó, reiniciando o CSS. A mensagem
   *   recém-enviada se mexia três vezes, em intervalos irregulares.
   *
   * O registro é compartilhado com a fila de envio (`service/Outbox`) porque a
   * mensagem própria troca de identidade no meio do caminho: aparece com o id
   * da fila (`envio-…`) e é substituída pela definitiva, com o id do WhatsApp.
   * A fila marca o id definitivo ao confirmar, então a substituição não conta
   * como bolha nova.
   */
  // Guarda local além do registro compartilhado: `marcaComoAnimada` só corre no
  // efeito, e sem isto um re-render entre o render e o efeito reavaliaria
  // `animar` como verdadeiro. Guarda o **id**, não um booleano: a instância do
  // componente é reaproveitada quando a bolha otimista vira definitiva, e um
  // `true` cru bloquearia a animação da mensagem seguinte.
  const animouLocal = useRef<string | null>(null);

  const animar =
    doAnimation &&
    isLast &&
    animouLocal.current !== message.message_id &&
    !jaAnimou(message.message_id);

  useEffect(() => {
    if (animar) {
      animouLocal.current = message.message_id;
      marcaComoAnimada(message.message_id);
    }
  }, [animar, message.message_id]);

  /**
   * Corpo de texto da bolha.
   *
   * Chamada como função (`DivWithEmoji()`), não montada como `<DivWithEmoji />`
   * - e é de propósito: como componente, o React a trataria como um tipo novo a
   * cada render e remontaria a subárvore, que é exatamente o problema descrito
   * no `ComProgresso` acima. Chamada direta, o JSX é inserido no lugar.
   *
   * O conteúdo já vem do `InterpretedContent`, que aplica o `fixHeartEmoji` -
   * ele acrescenta o seletor de variação ao `❤` cru, sem o qual o navegador o
   * desenha como caractere de texto preto em vez de emoji. Aplicá-lo de novo
   * aqui não era inofensivo: a função não é idempotente, e a segunda passada
   * deixava um segundo seletor invisível grudado no emoji (`❤️️`).
   */
  const DivWithEmoji = () => (
    <div>
      <Interweave content={InterpretedContent} />
    </div>
  );

  // Item da fila ainda sem prévia tem `media_url` vazio; renderizar o player
  // com src="" faz o navegador recarregar a página inteira.
  const exibeMidia = message.has_media && !message.media_expired && Boolean(message.media_url);

  const enviandoMidia = message.progresso !== undefined;

  // ⚠️ `surface-*` e não `gray-*`: o tema **inverte a escala de superfície** no
  // modo escuro (`surface-200` vira `#4b5563`), mas deixa os cinzas como estão
  // (`gray-200` continua `#e5e7eb`). Com `bg-gray-200` a bolha recebida ficava
  // clara sobre o chat escuro, e o `text-black` de antes sumia dentro dela.
  //
  // Na bolha própria, `text-primary-contrast` em vez de `text-white`: nos modos
  // escuros a primária é clara, e branco sobre ela não contrasta.
  const messageClass = apagadaComConteudo
    ? `${from_me ? 'align-self-end' : 'align-self-start'} border-red-400 ${from_me ? 'bg-primary-500 text-primary-contrast' : 'surface-200 text-color'}`
    : from_me
      ? 'align-self-end border-primary-300 bg-primary-500 text-primary-contrast'
      : 'align-self-start border-300 surface-200 text-color';

  return (
    <div
      className={classNames(
        `relative w-auto border-1 p-2 mb-1 border-round-lg message-item-${from_me ? 'from-me' : 'from-them'} ${messageClass}`,
        { 'mensagem-entrando': animar },
      )}
      // Figurinha sem balão, como no WhatsApp: a imagem (webp, animada ou não)
      // flutua sobre o fundo, só com o horário embaixo.
      style={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        ...(message.type === 'sticker' &&
          exibeMidia && { background: 'transparent', borderColor: 'transparent' }),
      }}
    >
      {message.hidden_at ? (
        // Removida só do nosso lado ("apagar para mim"): no WhatsApp do contato
        // ela continua. O marcador fica para o histórico não ter buracos
        // silenciosos - o atendente seguinte vê que houve algo ali.
        <div className="flex align-items-center gap-2 font-italic opacity-80">
          <i className="fa-regular fa-eye-slash" />
          <span>Mensagem removida do sistema</span>
        </div>
      ) : message.is_deleted && !ajustes.mostrar_conteudo_mensagem_apagada ? null : (
        <>
          {message.is_forwarded && (
            <div className="flex align-items-center gap-1 mb-1 text-xs font-italic opacity-70">
              <i className="fa-regular fa-share" />
              <span>Encaminhada</span>
            </div>
          )}
          {message.has_quoted && quotedMessage && (
            <QuotedMessageItem
              activeChat={activeChat}
              quoted={quotedMessage}
            />
          )}
          <div className="flex flex-column text-base ">
            {/* Expirada pela retenção: o arquivo saiu do storage, mas a
                mensagem e a legenda continuam no histórico. */}
            {message.has_media && message.media_expired && message.type !== 'location' && (
              <div
                className={classNames(
                  from_me ? 'bg-primary-600' : 'surface-200',
                  'flex align-items-center gap-2 border-round p-3 mb-2 text-sm',
                )}
              >
                <i className="fa-regular fa-clock-rotate-left" />
                <span>Mídia expirada</span>
              </div>
            )}
            {/* Mídia sem URL utilizável: item da fila retomado do armazenamento
                local, cujo `blob:` de prévia não sobrevive ao recarregar. */}
            {message.has_media && !message.media_expired && !message.media_url && (
              <div
                className={classNames(
                  from_me ? 'bg-primary-600' : 'surface-200',
                  'flex align-items-center gap-2 border-round p-3 mb-2 text-sm',
                )}
              >
                <i className="fa-regular fa-paperclip" />
                <span>{message.file_name ?? 'Arquivo'}</span>
              </div>
            )}
            {exibeMidia && message.type === 'document' && (
              <ComProgresso progresso={message.progresso}>
                <a
                  href={message.media_url}
                  target="_blank"
                  rel="noreferrer"
                  download={message.file_name ?? undefined}
                  className={classNames(
                    from_me ? 'bg-primary-600 text-primary-contrast' : 'surface-200 text-color',
                    'flex align-items-center gap-3 border-round p-3 mb-2 no-underline',
                  )}
                  style={{ maxWidth: 250 }}
                >
                  <i className={classNames(iconeDocumento(message.file_name), 'text-3xl')} />
                  <div className="flex flex-column overflow-hidden">
                    <span
                      className="text-sm font-medium white-space-nowrap overflow-hidden text-overflow-ellipsis"
                      title={message.file_name ?? 'Documento'}
                    >
                      {message.file_name ?? 'Documento'}
                    </span>
                    <span className="text-xs opacity-80">
                      {formataTamanhoArquivo(message.media_size)}
                    </span>
                  </div>
                </a>
              </ComProgresso>
            )}
            {exibeMidia && message.type === 'document' && DivWithEmoji()}
            {exibeMidia && message.type === 'image' && (
              <ComProgresso progresso={message.progresso}>
                <Image
                  // A `key` amarrada à URL é necessária: o `Image` guarda o src
                  // em estado interno para o modo `preview`, e ao trocar a
                  // prévia local (`blob:`) pela URL do storage o React
                  // reaproveita a instância - que segue apontando para um blob
                  // já revogado, exibindo o ícone de imagem quebrada.
                  key={message.media_url}
                  src={message.media_url}
                  alt={message.file_name ?? 'Imagem'}
                  className="mb-2 border-round shadow-2"
                  imageStyle={{ maxWidth: '250px', height: '250px', objectFit: 'cover' }}
                  preview
                  downloadable
                />
              </ComProgresso>
            )}
            {exibeMidia && message.type === 'image' && DivWithEmoji()}
            {exibeMidia && message.type === 'sticker' && (
              <ComProgresso progresso={message.progresso}>
                {/* `<img>` e não o `Image` do PrimeReact: sem preview/zoom, e o
                    webp animado toca nativamente. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={message.media_url}
                  src={message.media_url}
                  alt="Figurinha"
                  style={{ width: '10rem', maxWidth: '100%', height: 'auto', display: 'block' }}
                />
              </ComProgresso>
            )}
            {/* Voz gravada (`ptt`) e arquivo de áudio anexado (`audio`) tocam do
                mesmo jeito; o que muda é a origem, e o nome só existe no
                segundo caso. */}
            {exibeMidia && (message.type === 'ptt' || message.type === 'audio') && (
              <ComProgresso progresso={message.progresso}>
                {/* Espaço à direita para o chevron do menu, que fica em
                    `right-0 top-0` e cairia sobre o botão de velocidade. Fixo
                    e não só no hover: reservado na hora, o player não salta
                    quando o menu aparece. */}
                <div
                  className="mb-2 flex flex-column gap-1"
                  style={{ paddingRight: '1.75rem' }}
                >
                  {message.type === 'audio' && message.file_name && (
                    <span
                      className="text-sm font-medium white-space-nowrap overflow-hidden text-overflow-ellipsis"
                      title={message.file_name}
                    >
                      <i className="fa-regular fa-music mr-2" />
                      {message.file_name}
                    </span>
                  )}
                  {/* Player próprio no lugar do `<audio controls>`: o nativo
                      traz o menu de três pontos do Chrome e muda de cara a
                      cada navegador. */}
                  <PlayerAudio
                    url={message.media_url}
                    mimetype={message.media_type}
                    proprio={message.from_me}
                  />
                </div>
              </ComProgresso>
            )}
            {exibeMidia && message.type === 'audio' && DivWithEmoji()}
            {exibeMidia && message.type === 'video' && (
              <ComProgresso progresso={message.progresso}>
                <div
                  className="mb-2 relative "
                  // GIF (vídeo em loop do WhatsApp) maior que o vídeo comum: é o conteúdo
                  // da mensagem, e em 250px ficava pequeno demais.
                  style={{
                    // Largura fixa no GIF: só o teto não bastava, porque a
                    // caixa encolhia ao tamanho intrínseco do vídeo (pequeno).
                    ...(message.is_gif && { width: 380 }),
                    maxWidth: message.is_gif ? '100%' : 250,
                    maxHeight: message.is_gif ? 640 : 370,
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  {message.is_gif ? (
                    <VideoGif
                      src={message.media_url}
                      type={message.media_type}
                    />
                  ) : (
                  <video
                    // Mesmo motivo do `Image`: trocar o src de um <source> não
                    // recarrega o vídeo (exigiria `load()`), então a instância
                    // seguiria presa ao blob revogado da prévia local.
                    key={message.media_url}
                    controls={false}
                    className="w-full h-full pointer-events-none "
                    autoPlay={false}
                    loop={false}
                    muted={false}
                    playsInline
                    style={{
                      objectFit: 'fill',
                    }}
                  >
                    <source
                      src={message.media_url}
                      type={message.media_type}
                    />
                    Seu navegador não suporta o elemento de vídeo.
                  </video>
                  )}
                  {!message.is_gif && !enviandoMidia && (
                    <div
                      className="button-play absolute top-0 left-0 w-full h-full flex align-items-center justify-content-center "
                      onClick={() => setVideoPreview(message.media_url, message.media_type)}
                    >
                      <button
                        className="border-none bg-transparent border-circle h-5rem w-5rem flex align-items-center justify-content-center"
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="fa-light fa-circle-play text-6xl text-white"></i>
                      </button>
                    </div>
                  )}
                </div>
              </ComProgresso>
            )}
            {exibeMidia && message.type === 'video' && DivWithEmoji()}
            {contatosCompartilhados.length > 0 ? (
              <button
                type="button"
                onClick={() => setContatoAberto(true)}
                className={classNames(
                  from_me ? 'bg-primary-600 text-primary-contrast' : 'surface-200 text-color',
                  'flex align-items-center gap-3 border-none border-round p-3 mb-2 cursor-pointer text-left',
                )}
                style={{ minWidth: '12rem' }}
              >
                <i className="fa-regular fa-address-card text-3xl flex-none" />
                <span className="flex flex-column min-w-0">
                  <span className="font-medium white-space-nowrap overflow-hidden text-overflow-ellipsis">
                    {contatosCompartilhados[0].nome}
                  </span>
                  <span className="text-xs opacity-80">
                    {contatosCompartilhados.length > 1
                      ? `+ ${contatosCompartilhados.length - 1} contato${contatosCompartilhados.length > 2 ? 's' : ''}`
                      : contatosCompartilhados[0].telefones[0].exibicao}
                  </span>
                </span>
              </button>
            ) : message.type === 'view_once' ? (
              // Como o WhatsApp oficial: o conteúdo não chega a este aparelho,
              // só o aviso de que existe, para o atendente ver no celular.
              <div className="flex align-items-center gap-2 font-italic opacity-80">
                <i className="fa-regular fa-circle-1 text-lg flex-none" />
                <span>{content}</span>
              </div>
            ) : pix ? (
              // Cartão no estilo do WhatsApp: ícone Pix redondo + titular + tipo e
              // chave numa linha só (cortada), divisor e o botão de copiar.
              <div
                className={classNames(
                  from_me ? 'bg-primary-600 text-primary-contrast' : 'surface-200 text-color',
                  'flex flex-column border-round mb-2 overflow-hidden',
                )}
                style={{ width: '21rem', maxWidth: '100%' }}
              >
                <div className="flex align-items-center gap-3 p-3">
                  <span
                    className="flex align-items-center justify-content-center border-circle flex-none"
                    style={{
                      width: '3rem',
                      height: '3rem',
                      background: 'rgba(37, 211, 102, 0.18)',
                    }}
                  >
                    <i
                      className="fa-brands fa-pix text-2xl"
                      style={{ color: '#25d366' }}
                    />
                  </span>
                  <span className="flex flex-column min-w-0">
                    <span className="font-medium text-lg white-space-nowrap overflow-hidden text-overflow-ellipsis">
                      {pix.merchant_name ?? 'Chave Pix'}
                    </span>
                    <span className="text-base opacity-80 white-space-nowrap overflow-hidden text-overflow-ellipsis">
                      {{
                        EVP: 'Chave aleatória',
                        CPF: 'CPF',
                        CNPJ: 'CNPJ',
                        EMAIL: 'E-mail',
                        PHONE: 'Telefone',
                      }[pix.key_type ?? ''] ?? 'Chave'}
                      : {pix.key}
                    </span>
                    {pix.valor && (
                      <span className="text-base font-medium">
                        {pix.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copiarPix}
                  className="flex align-items-center justify-content-center gap-2 border-none border-top-1 p-3 cursor-pointer bg-transparent font-medium text-base"
                  style={{ color: '#25d366', borderTopColor: 'rgba(255, 255, 255, 0.15)' }}
                >
                  <i className={`fa-regular ${pixCopiado ? 'fa-check' : 'fa-copy'}`} />
                  {pixCopiado ? 'Chave copiada' : 'Copiar chave Pix'}
                </button>
              </div>
            ) : localizacao ? (
              <a
                href={localizacao.url}
                target="_blank"
                rel="noopener noreferrer"
                className={classNames(
                  from_me ? 'bg-primary-600 text-primary-contrast' : 'surface-200 text-color',
                  'flex flex-column border-round mb-2 no-underline overflow-hidden',
                )}
                style={{ minWidth: '14rem', maxWidth: '18rem', color: 'inherit' }}
              >
                {/* Miniatura do mapa que o próprio WhatsApp envia; o pino fica no
                    centro, que é onde o WhatsApp a centraliza. Sem miniatura
                    (mensagens antigas, ou expirada pela retenção), só o texto. */}
                {exibeMidia && (
                  <span className="relative flex" style={{ lineHeight: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={message.media_url}
                      alt="Mapa da localização"
                      style={{ width: '100%', display: 'block' }}
                    />
                    <i
                      className="fa-solid fa-location-dot text-3xl text-red-500 absolute"
                      style={{ left: '50%', top: '50%', transform: 'translate(-50%, -100%)' }}
                    />
                  </span>
                )}
                <span className="flex align-items-center gap-2 p-2">
                  {!exibeMidia && (
                    <i className="fa-solid fa-location-dot text-2xl flex-none text-red-500" />
                  )}
                  <span className="flex flex-column min-w-0">
                    <span className="font-medium">{localizacao.nome ?? 'Localização'}</span>
                    <span className="text-xs opacity-80">
                      {localizacao.endereco ?? localizacao.coordenadas}
                    </span>
                    <span className="text-xs underline">Abrir no mapa</span>
                  </span>
                </span>
              </a>
            ) : (
              !exibeMidia && DivWithEmoji()
            )}
            {contatosCompartilhados.length > 0 && (
              <ModalContatoCompartilhado
                visible={contatoAberto}
                onHide={() => setContatoAberto(false)}
                contatos={contatosCompartilhados}
              />
            )}
          </div>
        </>
      )}
      <div className="w-full text-right flex flex-wrap-nowrap align-items-end justify-content-end gap-1 ">
        {apagadaComConteudo && (
          // Revogada pelo autor, com o ajuste ligado: o corpo original aparece
          // normalmente, e só um ícone discreto - na mesma linha do horário/
          // check, como se fosse mais um indicador de status - marca que foi
          // apagada, sem competir com o conteúdo.
          <span className="white-space-nowrap">
            <i
              className="fa-regular fa-ban text-xs text-red-400"
              title="Mensagem apagada"
            />
          </span>
        )}
        <span className="text-xs white-space-nowrap">{ArrumaData(message.datetime)}</span>
        {message.from_me && (
          <span>
            <i className={`fa ${ProccessAck(message.ack)} text-xs`}></i>
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Memoizado: numa conversa longa, cada evento re-renderizaria todas as bolhas.
 * Só refaz quando a própria mensagem (ou sua citada) muda.
 */
export default memo(SingleMessageComponent);
