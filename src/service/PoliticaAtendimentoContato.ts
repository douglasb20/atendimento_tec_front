import type { ContactResponse } from '@/Interfaces';

export type ModoAtendimentoContato = 'normal' | 'somente_humano' | 'ignorar_mensagens';
export const MODOS_ATENDIMENTO_CONTATO: ModoAtendimentoContato[] = ['normal', 'somente_humano', 'ignorar_mensagens'];

export function modoAtendimentoDoContato(contato?: Pick<ContactResponse, 'ignore_support' | 'automation_disabled'>): ModoAtendimentoContato {
  if (contato?.ignore_support) return 'ignorar_mensagens';
  return contato?.automation_disabled ? 'somente_humano' : 'normal';
}

export function configuracaoAtendimentoContato(modo: ModoAtendimentoContato) {
  return { ignore_support: modo === 'ignorar_mensagens', automation_disabled: modo === 'somente_humano' };
}
