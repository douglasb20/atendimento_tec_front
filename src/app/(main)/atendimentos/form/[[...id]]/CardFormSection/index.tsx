'use client';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { SelectItem } from 'primereact/selectitem';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

import TitleCards from '@/components/TitleCards';
import { AtendimentosResponse, IServiceResponse, Shape } from '@/Interfaces';
import FormSection from './Form';
import ButtonsForm from './ButtonsForm';
import { msgRequired } from '@/service/Util';

type CardFormProps = {
  data: AtendimentosResponse;
  clientOptions: SelectItem[];
  tipoEntrada: SelectItem[];
  atendimentoStatus: SelectItem[];
  services: IServiceResponse[];
  usersOptions: SelectItem[];
  user: {
    id: number;
    name: string;
  };
};

export type AtendimentoFormType = {
  id?: number;
  atendimento_status_id: number;
  comentario: string;
  client_id: number;
  contact_id?: number;
  data_referencia: Date | string;
  hora_inicio: Date | string;
  hora_fim: Date | string;
  user_id?: number;
  user_nome?: string;
  tipo_entrada: 'T' | 'S';
  esta_pago: number;
  services?: AtendimentosResponse['atendimentosServicos'];
};

const defaultForm: AtendimentoFormType = {
  id: null,
  atendimento_status_id: 1,
  comentario: '',
  client_id: -1,
  contact_id: -1,
  data_referencia: new Date(),
  hora_inicio: null,
  hora_fim: null,
  user_id: null,
  user_nome: '',
  tipo_entrada: 'T',
  esta_pago: 0,
  services: [],
};

const schema = yup.object<yup.AnyObject, Shape<AtendimentoFormType>>({
  atendimento_status_id: yup.number().required(msgRequired),
  client_id: yup.number().required(msgRequired),
  contact_id: yup.number().notRequired(),
  comentario: yup.string().required(msgRequired),
  data_referencia: yup.mixed().required(msgRequired),
  hora_inicio: yup.mixed().required(msgRequired),
  hora_fim: yup.mixed().required(msgRequired),
  esta_pago: yup.number().required(msgRequired),
  tipo_entrada: yup.mixed<'T' | 'S'>().required(),
});

export default function CardFormSection(props: CardFormProps) {
  const { data, atendimentoStatus, clientOptions, tipoEntrada, services, usersOptions, user } =
    props;
  const [render, setRender] = useState(false);
  const methods = useForm<AtendimentoFormType>({
    shouldFocusError: false,
    reValidateMode: 'onChange',
    resolver: yupResolver<any>(schema),
  });

  useEffect(() => {
    methods.reset({
      ...defaultForm,
      ...data,
      user_id: user.id,
      user_nome: user.name,
      ...(data?.data_referencia && {
        data_referencia: new Date(`${data.data_referencia} 00:00:00`),
      }),
      ...(data?.hora_inicio && {
        hora_inicio: new Date(`${data.data_referencia} ${data.hora_inicio}`),
      }),
      ...(data?.hora_fim && { hora_fim: new Date(`${data.data_referencia} ${data.hora_fim}`) }),
      ...(data?.tipo_entrada === 'S' && { services: data.atendimentosServicos }),
    });
    setRender(true);
  }, []);
  return (
    render && (
      <>
        <TitleCards title="Cadastro de atendimento" />
        <FormProvider {...methods}>
          <div className="p-card-content grid p-fluid">
            <FormSection
              atendimentoStatus={atendimentoStatus}
              clientOptions={clientOptions}
              tipoEntrada={tipoEntrada}
              services={services}
              usersOptions={usersOptions}
            />
            <ButtonsForm />
          </div>
        </FormProvider>
      </>
    )
  );
}
