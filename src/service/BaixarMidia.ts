import type { SupportChatMessageResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta } from '@/service/Util';

export async function baixarMidia(mensagem: SupportChatMessageResponse) {
  try {
    const local = mensagem.media_url?.startsWith('blob:');
    // A navegação para uma URL assinada com Content-Disposition não depende
    // do CORS do bucket e não carrega vídeos inteiros na memória da aplicação.
    const url = local ? mensagem.media_url : (await useApi().FetchReq<{ url: string }>(
      'BaixarMidiaAtendimento', [String(mensagem.support_chat_id), encodeURIComponent(mensagem.message_id)],
    )).url;
    const link = document.createElement('a');
    link.href = url;
    const extensao = mensagem.media_type?.split('/')[1]?.split(';')[0] || 'bin';
    link.download = mensagem.file_name || `arquivo.${extensao}`;
    if (!local) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (erro) {
    CatchAlerta(erro, 'Não foi possível baixar o arquivo');
  }
}
