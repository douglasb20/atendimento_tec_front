'use client';

import { useCallback } from 'react';

import { useService } from '@/contexts/ServicesContext';
import { tipoDoArquivo } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';

/** O que a assinatura devolve. */
type Assinatura = { url: string; key: string; headers: Record<string, string> };

type CamposAnexo = {
  anexo_key?: string | null;
  anexo_nome?: string | null;
  anexo_mimetype?: string | null;
  anexo_tipo?: string | null;
};

/**
 * Sobe o anexo da saudação ou da despedida do canal.
 *
 * Mesmo padrão de `useSalvarRespostaRapida`, mas o canal tem **dois** anexos
 * independentes - um por mensagem -, então a resolução de cada um (novo,
 * removido, inalterado) é parametrizada em vez de fixa.
 */
export const useSalvarCanal = () => {
  const { FetchReq } = useApi();
  const { setLoading } = useService();

  const subirAnexo = useCallback(
    async (arquivo: File): Promise<string> => {
      const assinatura = await FetchReq<Assinatura>({
        endpoint: 'AssinarAnexoCanal',
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

  /** Resolve os três estados do anexo (novo, removido, inalterado) para o prefixo dado. */
  const resolveAnexo = useCallback(
    async (
      prefixo: 'saudacao' | 'despedida',
      arquivoNovo: File | null,
      removeuAnexo: boolean,
      atual?: Record<string, unknown> | null,
    ): Promise<CamposAnexo> => {
      if (arquivoNovo) {
        return {
          [`${prefixo}_anexo_key`]: await subirAnexo(arquivoNovo),
          [`${prefixo}_anexo_nome`]: arquivoNovo.name,
          [`${prefixo}_anexo_mimetype`]: arquivoNovo.type,
          [`${prefixo}_anexo_tipo`]: tipoDoArquivo(arquivoNovo.type),
        };
      }

      if (removeuAnexo) {
        return {
          [`${prefixo}_anexo_key`]: null,
          [`${prefixo}_anexo_nome`]: null,
          [`${prefixo}_anexo_mimetype`]: null,
          [`${prefixo}_anexo_tipo`]: null,
        };
      }

      return {
        [`${prefixo}_anexo_key`]: atual?.[`${prefixo}_anexo_key`] ?? null,
        [`${prefixo}_anexo_nome`]: atual?.[`${prefixo}_anexo_nome`] ?? null,
        [`${prefixo}_anexo_mimetype`]: atual?.[`${prefixo}_anexo_mimetype`] ?? null,
        [`${prefixo}_anexo_tipo`]: atual?.[`${prefixo}_anexo_tipo`] ?? null,
      };
    },
    [subirAnexo],
  );

  const resolveAnexos = useCallback(
    async (
      saudacao: { arquivoNovo: File | null; removeuAnexo: boolean },
      despedida: { arquivoNovo: File | null; removeuAnexo: boolean },
      atual?: Record<string, unknown> | null,
    ) => {
      try {
        setLoading(true);

        const [anexoSaudacao, anexoDespedida] = await Promise.all([
          resolveAnexo('saudacao', saudacao.arquivoNovo, saudacao.removeuAnexo, atual),
          resolveAnexo('despedida', despedida.arquivoNovo, despedida.removeuAnexo, atual),
        ]);

        return { ...anexoSaudacao, ...anexoDespedida };
      } finally {
        setLoading(false);
      }
    },
    [resolveAnexo, setLoading],
  );

  return { resolveAnexos };
};
