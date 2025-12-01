import { useState } from 'react';
import { SelectItem } from 'primereact/selectitem';
import { useFormContext, Controller } from 'react-hook-form';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputTextarea } from 'primereact/inputtextarea';

import { AtendimentoFormType } from '.';
import LabelPlus from '@/components/LabelPlus';
import { useService } from '@/contexts/ServicesContext';
import { CatchAlerta, getFormErrorMessage } from '@/service/Util';
import ApiClient from '@/service/Api/ApiClient';
import { ContactResponse, IServiceResponse } from '@/Interfaces';
import ServicesSection from './Services';

type FormSectionProps = {
  clientOptions: SelectItem[];
  tipoEntrada: SelectItem[];
  atendimentoStatus: SelectItem[];
  services: IServiceResponse[];
  usersOptions: SelectItem[];
};

const isPaid: SelectItem[] = [
  {
    value: 0,
    label: 'Não',
  },
  {
    value: 1,
    label: 'Sim',
  },
];

export default function FormSection(props: FormSectionProps) {
  const { atendimentoStatus, clientOptions, tipoEntrada, services, usersOptions } = props;
  const { setLoading } = useService();
  const { FetchReq } = ApiClient();
  const { control, setValue, watch } = useFormContext<AtendimentoFormType>();
  const [contactOptions, setContactOptions] = useState<SelectItem[]>([
    {
      value: -1,
      label: 'Nenhum',
    },
  ]);

  const onRequestContactsByClient = async (value: number): Promise<void> => {
    try {
      setLoading(true);
      const contactOpts: SelectItem[] = [
        {
          value: -1,
          label: 'Nenhum',
        },
      ];

      if (value !== -1) {
        const data = await FetchReq<ContactResponse[]>('BuscarContatoClientId', [value]);
        contactOpts.push(...data.map((e) => ({ label: e.name, value: e.id })));
      }

      setContactOptions(contactOpts);
      setValue('contact_id', -1);
    } catch (err) {
      CatchAlerta(err, 'Erro ao consultar contatos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="col-12 md:col-6">
        <Controller
          control={control}
          name="user_id"
          render={({ field, fieldState }) => (
            <>
              <LabelPlus
                text="Atendente"
                htmlFor={field.name}
                required
              />
              <Dropdown
                {...field}
                disabled
                invalid={fieldState.invalid}
                options={usersOptions}
                filter
              />
              {getFormErrorMessage(fieldState)}
            </>
          )}
        />
      </div>

      <div className="col-12 md:col-6"></div>
      <div className="col-12 md:col-3">
        <Controller
          control={control}
          name="client_id"
          render={({ field, fieldState }) => (
            <>
              <LabelPlus
                text="Cliente"
                htmlFor={field.name}
                required
              />
              <Dropdown
                {...field}
                invalid={fieldState.invalid}
                options={[...[{ label: 'Nenhum', value: -1 }], ...clientOptions]}
                onChange={(e) => {
                  const value = e.target.value;
                  onRequestContactsByClient(value);
                  field.onChange(e.value);
                }}
                filter
              />
              {getFormErrorMessage(fieldState)}
            </>
          )}
        />
      </div>

      <div className="col-12 md:col-3">
        <Controller
          control={control}
          name="contact_id"
          disabled={contactOptions.length < 2}
          render={({ field, fieldState }) => (
            <>
              <LabelPlus
                text="Contato"
                htmlFor={field.name}
              />
              <Dropdown
                {...field}
                invalid={fieldState.invalid}
                options={contactOptions}
                filter
              />
            </>
          )}
        />
      </div>

      <div className="col-12 md:col-3">
        <Controller
          control={control}
          name="tipo_entrada"
          render={({ field, fieldState }) => (
            <>
              <LabelPlus
                text="Tipo de atendimento"
                htmlFor={field.name}
                required
              />
              <Dropdown
                {...field}
                invalid={fieldState.invalid}
                options={tipoEntrada}
                onChange={(e) => {
                  field.onChange(e);
                  setValue('services', []);
                }}
              />
              {getFormErrorMessage(fieldState)}
            </>
          )}
        />
      </div>

      <div className="col-12 md:col-3">
        <Controller
          control={control}
          name="atendimento_status_id"
          render={({ field, fieldState }) => (
            <>
              <LabelPlus
                text="Status"
                htmlFor={field.name}
                required
              />
              <Dropdown
                {...field}
                invalid={fieldState.invalid}
                options={atendimentoStatus}
              />
              {getFormErrorMessage(fieldState)}
            </>
          )}
        />
      </div>

      <div className="col-12 md:col-3">
        <Controller
          control={control}
          name="data_referencia"
          render={({ field, fieldState }) => (
            <>
              <LabelPlus
                text="Data referência"
                htmlFor={field.name}
                required
              />
              <Calendar
                {...field}
                value={field.value as Date}
                invalid={fieldState.invalid}
                maxDate={new Date()}
              />
              {getFormErrorMessage(fieldState)}
            </>
          )}
        />
      </div>

      <div className="col-12 md:col-3">
        <Controller
          control={control}
          name="hora_inicio"
          render={({ field, fieldState }) => (
            <>
              <LabelPlus
                text="Hora início"
                htmlFor={field.name}
                required
              />
              <Calendar
                {...field}
                value={field.value as Date}
                invalid={fieldState.invalid}
                timeOnly
                mask="99:99"
              />
              {getFormErrorMessage(fieldState)}
            </>
          )}
        />
      </div>

      <div className="col-12 md:col-3">
        <Controller
          control={control}
          name="hora_fim"
          render={({ field, fieldState }) => (
            <>
              <LabelPlus
                text="Hora fim"
                htmlFor={field.name}
                required
              />
              <Calendar
                {...field}
                value={field.value as Date}
                invalid={fieldState.invalid}
                timeOnly
                mask="99:99"
              />
              {getFormErrorMessage(fieldState)}
            </>
          )}
        />
      </div>

      <div className="col-12 md:col-3">
        <Controller
          control={control}
          name="esta_pago"
          render={({ field, fieldState }) => (
            <>
              <LabelPlus
                text="Está pago?"
                htmlFor={field.name}
                required
              />
              <Dropdown
                {...field}
                invalid={fieldState.invalid}
                options={isPaid}
              />
              {getFormErrorMessage(fieldState)}
            </>
          )}
        />
      </div>

      <div className="col-12">
        <Controller
          control={control}
          name="comentario"
          render={({ field, fieldState }) => (
            <>
              <LabelPlus
                text="Comentário"
                htmlFor={field.name}
                required
              />
              <InputTextarea
                {...field}
                invalid={fieldState.invalid}
                autoResize
                className="pb-0 mb-0"
              />
              {getFormErrorMessage(fieldState)}
            </>
          )}
        />
      </div>
      {watch('tipo_entrada') === 'S' && <ServicesSection services={services} />}
    </>
  );
}
