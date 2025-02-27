'use client';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { SelectItem } from 'primereact/selectitem';

import TitleCards from '@/components/TitleCards';
import { AtendimentosResponse, IServiceResponse } from '@/Interfaces';
import FormSection from './Form';
import { DateToBR } from '@/service/Util';

type CardFormProps = {
  data: AtendimentosResponse;
  clientOptions: SelectItem[];
  tipoEntrada: SelectItem[];
  atendimentoStatus: SelectItem[];
  services: IServiceResponse[],
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
  data_referencia: Date;
  hora_inicio: Date;
  hora_fim: Date;
  user_id?: number;
  user_nome: string;
  tipo_entrada: "T" | "S";
  esta_pago: number;
  services?: AtendimentosResponse['atendimentosServicos']
}

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
  tipo_entrada: "T",
  esta_pago: 0,
  services: []
}

export default function CardFormSection(props: CardFormProps) {
  const { data, atendimentoStatus, clientOptions, tipoEntrada, services, user } = props;
  const [render, setRender] = useState(false);
  const methods = useForm<AtendimentoFormType>({
    reValidateMode: 'onChange'
  });

  useEffect(() => {
    console.log()
    methods.reset({
      ...defaultForm,
      ...data,
      user_id: user.id,
      user_nome: user.name,
      ...(data?.data_referencia && { data_referencia: new Date(`${data.data_referencia} 00:00:00`) }),
      ...(data?.hora_inicio && { hora_inicio: new Date(`${data.data_referencia} 00:00:00`) }),
      ...(data?.hora_fim && { hora_fim: new Date(`${data.data_referencia} 00:00:00`) })
    })
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
            />
          </div>
        </FormProvider>
      </>
    )
  );
}

