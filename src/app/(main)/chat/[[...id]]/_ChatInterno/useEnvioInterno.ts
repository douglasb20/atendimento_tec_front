'use client';

import { useCallback } from 'react';

import {
  EnviarMensagemInternaBody,
  InternalMessageResponse,
  InternalMessageType,
  SignatureResponse,
} from '@/Interfaces';
import { useUsuarioLogado } from '@/hooks/useUsuarioLogado';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta } from '@/service/Util';
import { useChatInternoStore } from '@/store/useChatInternoStore';
import type { ArquivoParaEnviar } from './CaixaEnvioInterna';

/**
 * Envio de mensagem interna.
 *
 * ⚠️ Não usa o `Outbox` do atendimento. Aquela fila é chaveada por
 * `supportChatId` e fala com os endpoints de `support-chats`; generalizá-la é
 * uma refatoração à parte, que mexeria no caminho crítico do WhatsApp. Aqui o
 * envio é direto e a mensagem aparece pelo socket, que volta para os dois lados.
 *
 * O que se perde com isso: retentativa automática e barra de progresso. Falha
 * vira alerta, e a pessoa reenvia. Para conversa entre colegas, num arquivo que
 * raramente é grande, é troca aceitável.
 */
export const useEnvioInterno = () => {
  const { FetchReq } = useApi();
  const { usuarioId } = useUsuarioLogado();
  const acrescentarMensagem = useChatInternoStore((s) => s.acrescentarMensagem);

  /**
   * Acrescenta na tela o que o POST devolveu.
   *
   * O socket também entrega esta mensagem, mas pode chegar depois da resposta
   * HTTP - sem isso a bolha piscaria com atraso. O guard de id na store impede
   * a duplicata quando os dois chegam.
   */
  const mostrarNaTela = useCallback(
    (mensagem: InternalMessageResponse) => acrescentarMensagem(mensagem, usuarioId),
    [acrescentarMensagem, usuarioId],
  );

  const enviarTexto = useCallback(
    async (destinatarioId: number, texto: string) => {
      try {
        const corpo: EnviarMensagemInternaBody = {
          type: InternalMessageType.TEXT,
          content: texto,
        };

        mostrarNaTela(
          await FetchReq<InternalMessageResponse>({
            endpoint: 'EnviarMensagemInterna',
            variables: [destinatarioId],
            body: corpo,
          }),
        );
      } catch (erro) {
        CatchAlerta(erro, 'Não foi possível enviar a mensagem');
      }
    },
    [FetchReq, mostrarNaTela],
  );

  /**
   * Sobe o arquivo direto ao storage e manda só a key.
   *
   * Mesmo caminho do atendimento: a URL assinada vem do backend, o navegador
   * faz o PUT, e o binário nunca passa pela API.
   */
  const subirArquivo = useCallback(
    async (arquivo: File): Promise<string> => {
      const assinatura = await FetchReq<SignatureResponse>({
        endpoint: 'AssinarMidiaInterna',
        body: { fileType: arquivo.type || 'application/octet-stream' },
      });

      const resposta = await fetch(assinatura.url, {
        method: 'PUT',
        body: arquivo,
        headers: assinatura.headers,
      });

      if (!resposta.ok) throw new Error(`Falha no upload (HTTP ${resposta.status})`);

      // A key, não a URL: é o que as colunas guardam.
      return assinatura.key;
    },
    [FetchReq],
  );

  const enviarArquivo = useCallback(
    async (destinatarioId: number, { arquivo, tipo, legenda }: ArquivoParaEnviar) => {
      try {
        const mediaKey = await subirArquivo(arquivo);

        const corpo: EnviarMensagemInternaBody = {
          type: tipo,
          media_key: mediaKey,
          mimetype: arquivo.type || 'application/octet-stream',
          media_size: arquivo.size,
          file_name: arquivo.name,
          ...(legenda && { content: legenda }),
        };

        mostrarNaTela(
          await FetchReq<InternalMessageResponse>({
            endpoint: 'EnviarMensagemInterna',
            variables: [destinatarioId],
            body: corpo,
          }),
        );
      } catch (erro) {
        CatchAlerta(erro, 'Não foi possível enviar o arquivo');
      }
    },
    [FetchReq, mostrarNaTela, subirArquivo],
  );

  const enviarAudio = useCallback(
    async (destinatarioId: number, arquivo: File) => {
      try {
        const mediaKey = await subirArquivo(arquivo);

        const corpo: EnviarMensagemInternaBody = {
          type: InternalMessageType.VOICE,
          media_key: mediaKey,
          mimetype: 'audio/ogg',
          media_size: arquivo.size,
          file_name: arquivo.name,
        };

        mostrarNaTela(
          await FetchReq<InternalMessageResponse>({
            endpoint: 'EnviarMensagemInterna',
            variables: [destinatarioId],
            body: corpo,
          }),
        );
      } catch (erro) {
        CatchAlerta(erro, 'Não foi possível enviar o áudio');
      }
    },
    [FetchReq, mostrarNaTela, subirArquivo],
  );

  return { enviarTexto, enviarArquivo, enviarAudio };
};
