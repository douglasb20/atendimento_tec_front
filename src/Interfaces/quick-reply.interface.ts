/** Tipos de anexo, no vocabulário que o provider entende. */
export type TipoAnexo = 'image' | 'video' | 'audio' | 'document';

/** Mensagem pronta que o atendente insere digitando `/atalho` na conversa. */
export type QuickReplyResponse = {
  id: number;
  /** Sem a barra - ela é o gatilho, não parte do nome. */
  atalho: string;
  mensagem: string;
  /** A key no storage. Nulo quando a resposta é só texto. */
  anexo_key: string | null;
  /** O nome original, que o WhatsApp exibe. */
  anexo_nome: string | null;
  anexo_mimetype: string | null;
  anexo_tipo: TipoAnexo | null;
  /** Só na leitura: a URL pública, montada a partir da key. */
  anexo_url?: string;
  created_at: string;
  updated_at: string | null;
};

/** O que a tela envia ao salvar. */
export type QuickReplyForm = {
  id?: number;
  atalho: string;
  mensagem: string;
  anexo_key?: string | null;
  anexo_nome?: string | null;
  anexo_mimetype?: string | null;
  anexo_tipo?: TipoAnexo | null;
};

/**
 * O tipo de anexo a partir do mimetype do arquivo.
 *
 * O provider trata cada um de um jeito - imagem vira miniatura, áudio vira
 * player, documento vira arquivo para baixar. O que não casa vai como
 * documento, que é o tratamento genérico.
 */
export const tipoDoArquivo = (mimetype: string): TipoAnexo => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'document';
};
