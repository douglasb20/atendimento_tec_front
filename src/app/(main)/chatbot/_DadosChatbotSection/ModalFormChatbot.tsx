import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';

import LabelPlus from '@/components/LabelPlus';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';
import { ChatbotResponse, ChatbotType, Shape } from '@/Interfaces';
import { getFormErrorMessage, msgRequired } from '@/service/Util';

export type FormChatbot = { name: string; type: ChatbotType };

type ModalProps = {
  visible: boolean;
  onHide: () => void;
  data: ChatbotResponse | null;
  onConfirm: (fields: FormChatbot) => void;
};

const defaultForm: FormChatbot = { name: '', type: 'entrada' };

const TIPOS: { id: ChatbotType; name: string }[] = [
  { id: 'entrada', name: 'Entrada' },
  { id: 'saida', name: 'Saída' },
  { id: 'agendamento', name: 'Agendamento' },
];

const schema = yup.object<yup.AnyObject, Shape<FormChatbot>>({
  name: yup.string().required(msgRequired).max(120, 'Máximo de 120 caracteres'),
  type: yup
    .mixed<ChatbotType>()
    .oneOf(['entrada', 'saida', 'agendamento', 'complementar'])
    .required(msgRequired),
});

function ModalFormChatbot({ visible, onHide, data, onConfirm }: ModalProps) {
  const { podeAdicionar, podeEditar, semPermissao } = usePermissoesModulo('chatbot');

  const somenteLeitura = data?.id ? !podeEditar : !podeAdicionar;

  const { control, handleSubmit, reset } = useForm<FormChatbot>({
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema),
  });

  useEffect(() => {
    if (visible) {
      reset(
        data
          ? { name: data.name, type: data.type }
          : defaultForm,
      );
    }
  }, [visible, data, reset]);

  const modalFooter = () => (
    <div className="flex justify-content-between">
      <Button
        label="Cancelar"
        severity="danger"
        outlined
        onClick={onHide}
      />
      <Button
        label="Salvar"
        disabled={somenteLeitura}
        title={somenteLeitura ? semPermissao : undefined}
        onClick={() => handleSubmit(onConfirm)()}
      />
    </div>
  );

  return (
    <Modal
      modal
      className="p-fluid"
      style={{ width: '32rem' }}
      breakpoints={{ '640px': '95vw' }}
      visible={visible}
      header={!data?.id ? 'Novo chatbot' : 'Alterar chatbot'}
      onHide={onHide}
      footer={modalFooter}
    >
      <div className="flex flex-column gap-4">
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <div>
              <LabelPlus
                htmlFor={field.name}
                text="Nome"
                required
              />
              <InputText
                id={field.name}
                {...field}
                value={field?.value || ''}
                placeholder="Atendimento inicial"
                autoFocus
                disabled={somenteLeitura}
              />
              {getFormErrorMessage(fieldState)}
            </div>
          )}
        />

        <Controller
          control={control}
          name="type"
          render={({ field, fieldState }) => (
            <div>
              <LabelPlus
                htmlFor={field.name}
                text="Tipo"
                required
                textHelp="Entrada dispara no início do atendimento; Saída, ao final; Agendamento, por horário."
              />
              <Dropdown
                id={field.name}
                {...field}
                options={TIPOS}
                optionLabel="name"
                optionValue="id"
                disabled={somenteLeitura || !!data?.id}
              />
              {getFormErrorMessage(fieldState)}
            </div>
          )}
        />

        {data?.channels?.length ? <div>
          <LabelPlus text="Canais vinculados" />
          <span>{data.channels.map((canal) => canal.name).join(', ')}</span>
        </div> : null}
        <small className="text-color-secondary">Escolha os fluxos de entrada e saída em Conexões → Editar conexão → Chatbot.</small>
      </div>
    </Modal>
  );
}

export default ModalFormChatbot;
