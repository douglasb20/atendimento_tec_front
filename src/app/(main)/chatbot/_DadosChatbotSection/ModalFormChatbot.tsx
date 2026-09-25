import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';

import LabelPlus from '@/components/LabelPlus';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';
import { ChatbotResponse, ChatbotType, Shape } from '@/Interfaces';
import ApiClient from '@/service/Api/ApiClient';
import { getFormErrorMessage, msgRequired } from '@/service/Util';

export type FormChatbot = { name: string; type: ChatbotType; channel_id: number | null };

type Canal = { id: number; name: string };

type ModalProps = {
  visible: boolean;
  onHide: () => void;
  data: ChatbotResponse | null;
  onConfirm: (fields: FormChatbot) => void;
};

const defaultForm: FormChatbot = { name: '', type: 'entrada', channel_id: null };

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
  channel_id: yup
    .number()
    .nullable()
    .when('type', {
      is: (type: ChatbotType) => type !== 'complementar',
      then: (schema) => schema.required('Selecione um canal'),
      otherwise: (schema) => schema.notRequired(),
    }),
});

function ModalFormChatbot({ visible, onHide, data, onConfirm }: ModalProps) {
  const { podeAdicionar, podeEditar, semPermissao } = usePermissoesModulo('chatbot');
  const { FetchReq } = ApiClient();
  const [canais, setCanais] = useState<Canal[]>([]);

  const somenteLeitura = data?.id ? !podeEditar : !podeAdicionar;

  const { control, handleSubmit, reset, watch } = useForm<FormChatbot>({
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema),
  });

  const tipoSelecionado = watch('type');

  useEffect(() => {
    if (!visible) return;

    const carregarCanais = async () => {
      try {
        setCanais((await FetchReq<Canal[]>('ListarCanais')) ?? []);
      } catch {
        setCanais([]);
      }
    };

    carregarCanais();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (visible) {
      reset(
        data
          ? { name: data.name, type: data.type, channel_id: data.channel_id }
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

        {tipoSelecionado !== 'complementar' && (
          <Controller
            control={control}
            name="channel_id"
            render={({ field, fieldState }) => (
              <div>
                <LabelPlus
                  htmlFor={field.name}
                  text="Canal"
                  required
                  textHelp="Só um chatbot deste tipo pode ficar ativo por canal."
                />
                <Dropdown
                  id={field.name}
                  {...field}
                  options={canais}
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Selecione o canal"
                  filter={canais.length > 6}
                  disabled={somenteLeitura}
                />
                {getFormErrorMessage(fieldState)}
              </div>
            )}
          />
        )}
      </div>
    </Modal>
  );
}

export default ModalFormChatbot;
