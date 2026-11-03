import { useEffect, useState } from 'react';
import { Control, Controller, useWatch } from 'react-hook-form';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { Message } from 'primereact/message';
import { Button } from 'primereact/button';

import LabelPlus from '@/components/LabelPlus';
import { ChannelResponse, ChatbotResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { useAjustesAtendimentoStore } from '@/store/useAjustesAtendimentoStore';

type Props = { control: Control<ChannelResponse>; somenteLeitura: boolean; visivel: boolean };

export default function AbaChatbot({ control, somenteLeitura, visivel }: Props) {
  const { FetchReq } = useApi();
  const habilitadoNoSistema = useAjustesAtendimentoStore((estado) => estado.ajustes.chatbot_habilitado);
  const habilitado = useWatch({ control, name: 'chatbot_habilitado' });
  const saidaSelecionada = useWatch({ control, name: 'chatbot_saida_id' });
  const [fluxos, setFluxos] = useState<ChatbotResponse[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);

  const carregar = async () => {
    setCarregando(true); setErro(false);
    try { setFluxos(await FetchReq<ChatbotResponse[]>('ListarChatbotsDoCanal') ?? []); }
    catch { setErro(true); }
    finally { setCarregando(false); }
  };
  useEffect(() => {
    if (visivel && habilitadoNoSistema) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visivel, habilitadoNoSistema]);

  if (!habilitadoNoSistema) return <Message severity="info" text="O módulo Chatbot está desabilitado nas configurações do sistema. Os vínculos deste canal são preservados." />;

  return <div className="flex flex-column gap-4 pt-3">
    <Controller control={control} name="chatbot_habilitado" render={({ field }) => <div className="flex align-items-center gap-2">
      <InputSwitch inputId={field.name} checked={!!field.value} onChange={(e) => field.onChange(e.value)} disabled={somenteLeitura} />
      <LabelPlus htmlFor={field.name} text="Usar chatbot neste canal"
        textHelp="Desabilitar preserva os fluxos escolhidos. Sem fluxo de entrada, continuam valendo a saudação e as regras normais do canal." />
    </div>} />
    {erro && <div className="flex align-items-center gap-2"><Message severity="warn" text="Não foi possível carregar os fluxos. Os vínculos atuais não foram alterados." />
      <Button label="Tentar novamente" text onClick={carregar} /></div>}
    {(['entrada', 'saida'] as const).map((tipo) => <Controller key={tipo} control={control} name={tipo === 'entrada' ? 'chatbot_entrada_id' : 'chatbot_saida_id'}
      render={({ field }) => {
        const escolhido = fluxos.find((fluxo) => fluxo.id === field.value);
        const opcoes = fluxos.filter((fluxo) => fluxo.type === tipo).map((fluxo) => ({ id: fluxo.id,
          nome: `${fluxo.name}${!fluxo.active ? ' (inativo)' : !fluxo.current_published_version_id ? ' (rascunho)' : ''}` }));
        if (field.value != null && !escolhido) opcoes.push({ id: field.value, nome: `Fluxo vinculado #${field.value}` });
        return <div>
          <LabelPlus htmlFor={field.name} text={`Chatbot de ${tipo === 'entrada' ? 'entrada' : 'saída'}`}
            textHelp={tipo === 'entrada'
              ? 'Inicia na primeira mensagem de um novo atendimento e substitui a saudação automática. Precisa estar ativo e publicado.'
              : 'Executa após a finalização humana, no mesmo protocolo, quando escolhido no encerramento. Não dispara em Finalizar sem atendimento.'} />
          <Dropdown inputId={field.name} value={field.value ?? null} onChange={(e) => field.onChange(e.value ?? null)}
            options={opcoes} optionLabel="nome" optionValue="id" showClear filter placeholder="Nenhum fluxo"
            disabled={somenteLeitura || !habilitado || carregando || erro} loading={carregando} />
          {escolhido && (!escolhido.active || !escolhido.current_published_version_id) && <Message className="mt-2" severity="warn"
            text="Este fluxo precisa estar ativo e publicado para executar." />}
        </div>;
      }} />)}
    <Controller control={control} name="chatbot_saida_por_padrao" render={({ field }) => <div>
      <div className="flex align-items-center gap-2">
        <InputSwitch inputId={field.name} checked={field.value ?? true} onChange={(e) => field.onChange(e.value)}
          disabled={somenteLeitura || !habilitado || !saidaSelecionada} />
        <LabelPlus htmlFor={field.name} text="Executar fluxo de saída por padrão ao finalizar"
          textHelp="Vale quando o fluxo de saída estiver ativo e publicado. Atendentes sem a permissão “Alterar execução do fluxo de saída” seguem obrigatoriamente este padrão. A despedida continua independente." />
      </div>
    </div>} />
  </div>;
}
