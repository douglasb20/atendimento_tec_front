import { ItemFila, useOutboxStore } from '@/store/useOutboxStore';
import { SignatureResponse } from '@/Interfaces';

/**
 * Processa a fila de envio fora da árvore de componentes.
 *
 * Uma cadeia de promessas por conversa garante ordem: dois vídeos no mesmo chat
 * sobem um após o outro, enquanto conversas distintas seguem em paralelo. É o
 * mesmo motivo do `concurrency: 1` no BullMQ do backend — preservar a ordem
 * dentro da conversa.
 */

type EnvioResponse = { status: string; message_id: string };
type Requisicao = <T = unknown>(props: unknown, vars?: (string | number)[]) => Promise<T>;

const MAX_TENTATIVAS = 3;

/** Uma corrente de promessas por conversa; a chave é o id do chat. */
const correntes = new Map<string, Promise<void>>();

/** Arquivos aguardando upload, fora da store: um File não sobrevive ao JSON. */
const arquivos = new Map<string, File>();

/** Um controlador por upload em curso, para poder abortá-lo. */
const abortadores = new Map<string, AbortController>();

export function registrarArquivo(itemId: string, arquivo: File) {
  arquivos.set(itemId, arquivo);
}

/**
 * Cancela o envio: aborta o upload em curso e tira o item da fila.
 *
 * O que já chegou ao provider não volta atrás — daí a checagem de `enviando`
 * ser feita por quem chama, liberando o cancelamento apenas enquanto o arquivo
 * ainda está subindo.
 */
export function cancelarItem(itemId: string) {
  abortadores.get(itemId)?.abort();
  abortadores.delete(itemId);
  arquivos.delete(itemId);
  useOutboxStore.getState().remover(itemId);
}

/**
 * Coloca o item na corrente da sua conversa. Retorna imediatamente — quem chama
 * não espera o envio, que é justamente o ponto de existir uma fila.
 *
 * O upload começa **fora** da corrente, em paralelo com os demais: só o envio
 * ao provider é serializado. Sem isso, selecionar três vídeos faria o terceiro
 * esperar os dois primeiros subirem inteiros antes de começar o próprio upload.
 */
export function processarItem(item: ItemFila, fetchReq: Requisicao) {
  const uploadPronto = item.tipo === 'texto' ? Promise.resolve(item) : subirArquivo(item, fetchReq);

  const anterior = correntes.get(item.supportChatId) ?? Promise.resolve();

  const atual = anterior
    .catch(() => undefined) // a falha de um item não trava os seguintes
    .then(() => uploadPronto)
    .then((pronto) => executar(pronto, fetchReq))
    .catch(() => undefined); // o erro já foi tratado e registrado no item

  correntes.set(item.supportChatId, atual);
}

/**
 * Sobe o arquivo ao storage e devolve o item com a `mediaKey` preenchida.
 * Roda em paralelo entre itens; o que aguarda a vez é apenas o envio.
 */
async function subirArquivo(item: ItemFila, fetchReq: Requisicao): Promise<ItemFila> {
  if (item.mediaKey) return item; // numa retentativa o arquivo já pode estar lá

  const { atualizar } = useOutboxStore.getState();
  const arquivo = arquivos.get(item.id);
  if (!arquivo) throw new Error('Arquivo não disponível para envio');

  const assinatura = await fetchReq<SignatureResponse>({
    endpoint: 'AssinarMediaUpload',
    body: { key: item.tipo === 'voz' ? 'chat/voices' : 'chat/media', fileType: arquivo.type },
  });

  const abortador = new AbortController();
  abortadores.set(item.id, abortador);

  try {
    await enviarComProgresso(assinatura, arquivo, abortador, (pct) =>
      atualizar(item.id, { progresso: pct }),
    );
  } finally {
    abortadores.delete(item.id);
  }

  atualizar(item.id, { mediaKey: assinatura.key });
  return { ...item, mediaKey: assinatura.key };
}

/**
 * PUT com acompanhamento de progresso.
 *
 * Usa `XMLHttpRequest` porque o `fetch` não expõe progresso de upload — só de
 * download. Para um vídeo de centenas de MB, ver a barra avançar é a diferença
 * entre "está travado" e "está subindo".
 */
function enviarComProgresso(
  assinatura: SignatureResponse,
  arquivo: File,
  abortador: AbortController,
  aoProgredir: (porcentagem: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', assinatura.url);

    Object.entries(assinatura.headers ?? {}).forEach(([chave, valor]) =>
      xhr.setRequestHeader(chave, valor),
    );

    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable) {
        aoProgredir(Math.round((evento.loaded / evento.total) * 100));
      }
    };

    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(xhr.statusText || 'Falha no upload'));

    xhr.onerror = () => reject(new Error('Falha de rede durante o upload'));

    // O cancelamento continua vindo do mesmo AbortController usado no resto.
    xhr.onabort = () => reject(Object.assign(new Error('Upload cancelado'), { name: 'AbortError' }));
    abortador.signal.addEventListener('abort', () => xhr.abort());

    xhr.send(arquivo);
  });
}

async function executar(item: ItemFila, fetchReq: Requisicao): Promise<void> {
  const { atualizar, remover } = useOutboxStore.getState();

  // O item pode ter sido removido enquanto esperava a vez na corrente.
  if (!useOutboxStore.getState().itens.some((i) => i.id === item.id)) return;

  atualizar(item.id, { status: 'enviando', erro: undefined });

  try {
    // O upload já correu em paralelo, antes da vez na corrente.
    const mediaKey = item.mediaKey;

    if (item.tipo === 'texto') {
      await fetchReq<EnvioResponse>({
        endpoint: item.quotedMessageId ? 'SendReply' : 'SendMessage',
        body: {
          chat_id: item.chatId,
          message: item.conteudo,
          ...(item.quotedMessageId && { message_id: item.quotedMessageId }),
        },
        variables: [item.supportChatId],
      });
    } else {
      await fetchReq<EnvioResponse>({
        endpoint: 'SendMedia',
        body: {
          chat_id: item.chatId,
          media_key: mediaKey,
          media_type: item.tipo === 'voz' ? 'voice' : item.mediaType,
          // O mimetype real vem do arquivo; a Evolution o repassa ao Baileys.
          ...(arquivos.get(item.id)?.type && { mimetype: arquivos.get(item.id).type }),
          ...(item.fileName && { file_name: item.fileName }),
          ...(item.conteudo && { caption: item.conteudo }),
          ...(item.quotedMessageId && { quoted_message_id: item.quotedMessageId }),
        },
        variables: [item.supportChatId],
      });
    }

    arquivos.delete(item.id);

    // Sai da fila assim que o backend confirma: a mensagem já está gravada lá e
    // chega à tela pelo webhook. Manter o item aqui exibiria duas bolhas — a
    // real e a pendente, esta sem mídia utilizável.
    remover(item.id);
  } catch (erro) {
    // Cancelamento não é falha: o item já saiu da fila e não deve ser retentado.
    if (erro?.name === 'AbortError') return;

    const tentativas = item.tentativas + 1;
    const mensagem = erro?.response?.data?.message ?? erro?.message ?? 'Falha ao enviar';

    if (tentativas < MAX_TENTATIVAS) {
      atualizar(item.id, { tentativas, status: 'pendente', erro: mensagem });
      // Espera crescente: falha momentânea de rede costuma passar sozinha.
      await new Promise((r) => setTimeout(r, 1500 * tentativas));

      // Refaz o upload quando foi ele que falhou — com a key já preenchida,
      // `subirArquivo` devolve o item na hora.
      const pronto =
        item.tipo === 'texto' ? item : await subirArquivo({ ...item, tentativas }, fetchReq);

      return executar({ ...pronto, tentativas }, fetchReq);
    }

    // Esgotadas as tentativas, o item permanece visível com opção de repetir —
    // sumir com ele faria o atendente perder o que escreveu.
    atualizar(item.id, { tentativas, status: 'falhou', erro: mensagem });
  }
}

/** Recoloca na fila um item que falhou, acionado pelo botão de repetir. */
export function reenviar(itemId: string, fetchReq: Requisicao) {
  const { itens, atualizar } = useOutboxStore.getState();
  const item = itens.find((i) => i.id === itemId);
  if (!item) return;

  // Sem o arquivo em memória não há o que reenviar: ele não sobrevive ao
  // recarregar da página, e sem `mediaKey` nem chegou ao storage.
  if (item.tipo !== 'texto' && !item.mediaKey && !arquivos.has(item.id)) {
    atualizar(itemId, {
      status: 'falhou',
      erro: 'O arquivo não está mais disponível — selecione-o novamente.',
    });
    return;
  }

  atualizar(itemId, { tentativas: 0, status: 'pendente' });
  processarItem({ ...item, tentativas: 0 }, fetchReq);
}

/** Um item só pode ser reenviado se o arquivo ainda estiver acessível. */
export function podeReenviar(item: ItemFila): boolean {
  return item.tipo === 'texto' || Boolean(item.mediaKey) || arquivos.has(item.id);
}
