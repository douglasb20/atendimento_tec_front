'use client';

import { useCallback } from 'react';

import { useService } from '@/contexts/ServicesContext';
import { QuickReplyForm, QuickReplyResponse, tipoDoArquivo } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';

/** O que a assinatura devolve. */
type Assinatura = { url: string; key: string; headers: Record<string, string> };

/**
 * Salvar uma resposta rápida - upload do anexo incluso.
 *
 * Vive num hook porque há **dois** lugares que criam resposta rápida: a tela de
 * cadastro e o rodapé da lista flutuante do chat. Duplicar os três estados do
 * anexo (novo, removido, inalterado) nos dois faria a próxima mudança acertar
 * só um deles.
 *
 * Não trata erro nem fecha modal: quem chama decide o que fazer, porque o
 * cadastro recarrega a tabela e o chat recarrega a lista do atalho.
 */
export const useSalvarRespostaRapida = () => {
  const { FetchReq } = useApi();
  const { setLoading } = useService();

  /**
   * Sobe o arquivo e devolve a key.
   *
   * Sem barra de progresso, diferente do envio de mídia no chat: aqui o limite
   * é 16 MB e o upload é parte de um salvamento que já mostra o loading global.
   */
  const subirAnexo = useCallback(
    async (arquivo: File): Promise<string> => {
      const assinatura = await FetchReq<Assinatura>({
        endpoint: 'AssinarAnexoRespostaRapida',
        body: { fileType: arquivo.type, fileName: arquivo.name },
      });

      // PUT com o arquivo cru: o Backblaze não aceita o POST-policy do S3.
      const resposta = await fetch(assinatura.url, {
        method: 'PUT',
        headers: assinatura.headers,
        body: arquivo,
      });

      if (!resposta.ok) {
        throw new Error(resposta.statusText || 'Erro ao enviar o anexo');
      }

      return assinatura.key;
    },
    [FetchReq],
  );

  const salvar = useCallback(
    async (
      fields: QuickReplyForm,
      arquivoNovo: File | null,
      removeuAnexo: boolean,
      /** A resposta em edição; ausente cria uma nova. */
      atual?: QuickReplyResponse | null,
    ): Promise<void> => {
      try {
        setLoading(true);

        // O anexo tem três estados: novo (sobe e usa a key nova), removido
        // (tudo nulo) e inalterado (mantém o que está gravado).
        let anexo: Pick<
          QuickReplyForm,
          'anexo_key' | 'anexo_nome' | 'anexo_mimetype' | 'anexo_tipo'
        >;

        if (arquivoNovo) {
          anexo = {
            anexo_key: await subirAnexo(arquivoNovo),
            anexo_nome: arquivoNovo.name,
            anexo_mimetype: arquivoNovo.type,
            anexo_tipo: tipoDoArquivo(arquivoNovo.type),
          };
        } else if (removeuAnexo) {
          anexo = {
            anexo_key: null,
            anexo_nome: null,
            anexo_mimetype: null,
            anexo_tipo: null,
          };
        } else {
          anexo = {
            anexo_key: atual?.anexo_key ?? null,
            anexo_nome: atual?.anexo_nome ?? null,
            anexo_mimetype: atual?.anexo_mimetype ?? null,
            anexo_tipo: atual?.anexo_tipo ?? null,
          };
        }

        const body = { atalho: fields.atalho.trim(), mensagem: fields.mensagem, ...anexo };

        if (atual?.id) {
          await FetchReq({
            endpoint: 'AtualizarRespostaRapida',
            variables: [atual.id],
            body,
          });
        } else {
          await FetchReq({ endpoint: 'AdicionarRespostaRapida', body });
        }
      } finally {
        setLoading(false);
      }
    },
    [FetchReq, setLoading, subirAnexo],
  );

  return { salvar };
};
