import { SupportChatStatusId, SupportChatsResponse } from '@/Interfaces';
import { nomeCompleto } from '@/service/Util';

type Props = { conversa: SupportChatsResponse };

export function CabecalhoConversa({ conversa }: Props) {
  const canal = conversa.channel?.name || 'Canal não informado';
  const setor = conversa.department?.name || 'Sem setor';

  return (
    <div className="conversa-identificacao">
      <span className="conversa-identificacao__canal" title={`Canal: ${canal}`}>
        <i className="pi pi-link" aria-hidden="true" />
        <span className="conversa-identificacao__texto">{canal}</span>
      </span>
      <span className="conversa-identificacao__setor" title={`Setor: ${setor}`}>
        <i className="pi pi-sitemap" aria-hidden="true" style={{ color: conversa.department?.color || 'var(--orange-500)' }} />
        <span className="conversa-identificacao__texto">{setor}</span>
      </span>
    </div>
  );
}

export function ResponsavelConversa({ conversa }: Props) {
  // O dono histórico do pós-atendimento não significa atendimento humano ativo.
  if (conversa.support_chat_status_id !== SupportChatStatusId.EM_ANDAMENTO || conversa.user_id == null) return null;
  const atendente = nomeCompleto(conversa.user) || 'Atendente não informado';

  return (
    <div className="conversa-responsavel" title={`Atendente: ${atendente}`}>
      <i className="pi pi-user" aria-hidden="true" />
      <span className="conversa-identificacao__texto">{atendente}</span>
    </div>
  );
}
