import { Dropdown } from 'primereact/dropdown';
import LabelPlus from '@/components/LabelPlus';
import type { ModoAtendimentoContato } from '@/service/PoliticaAtendimentoContato';

type Props = {
  inputId: string;
  value: ModoAtendimentoContato;
  onChange: (modo: ModoAtendimentoContato) => void;
  disabled?: boolean;
};

export default function AtendimentoContato({ inputId, value, onChange, disabled }: Props) {
  return <div className="flex flex-column gap-2">
    <LabelPlus htmlFor={inputId} text="Atendimento deste contato" required
      textHelp={<div className="flex flex-column gap-3">
        <div><strong>Normal:</strong> permite atendimento e as automações configuradas.</div>
        <div><strong>Somente humano:</strong> recebe mensagens e permite atendimento manual, sem chatbot, mensagens automáticas ou encerramento automático por inatividade.</div>
        <div><strong>Ignorar mensagens recebidas:</strong> descarta as entradas, sem gerar conversa ou protocolo. Não bloqueia envios manuais.</div>
      </div>} />
    <Dropdown inputId={inputId} value={value} disabled={disabled} className="w-full"
      options={[{ label: 'Normal', value: 'normal' }, { label: 'Somente humano', value: 'somente_humano' },
        { label: 'Ignorar mensagens recebidas', value: 'ignorar_mensagens' }]}
      onChange={e => onChange(e.value)} />
  </div>;
}
