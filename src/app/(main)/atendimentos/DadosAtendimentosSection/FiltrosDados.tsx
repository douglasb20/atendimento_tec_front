import { useEffect } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { useForm, Controller } from 'react-hook-form';
import { startOfMonth } from 'date-fns';
import { Calendar } from 'primereact/calendar';

import { IUsuariosResponse } from '@/Interfaces';
import LabelPlus from '@/components/LabelPlus';
import { Button } from 'primereact/button';

type FiltrosDadosProps = {
  users: IUsuariosResponse[];
  currentUser: number;
  onSubmitFilter: (userId: number, data_inicio: Date, data_fim: Date) => void;
};

interface FiltroForm {
  user_id: number;
  data_inicio: Date;
  data_fim: Date;
}

const defaultValues: FiltroForm = {
  user_id: 0,
  data_inicio: startOfMonth(new Date()),
  data_fim: new Date(),
};

export default function FiltrosDados(props: FiltrosDadosProps) {
  const { users, currentUser, onSubmitFilter } = props;
  const { control, reset, watch, handleSubmit } = useForm<FiltroForm>();

  const onSubmit = (fields: FiltroForm) => {
    onSubmitFilter && onSubmitFilter(fields.user_id, fields.data_inicio, fields.data_fim);
  }

  useEffect(() => {
    reset({ ...defaultValues, user_id: currentUser });
  }, []);
  return (
    <div className="grid mb-3">
      <div className="col-3 p-fluid mb-2 pl-0">
        <Controller
          control={control}
          name="user_id"
          render={({ field }) => (
            <>
              <LabelPlus text="Técnico" />
              <Dropdown
                options={users.map((e) => ({ label: e.name, value: e.id }))}
                filter
                value={field.value || currentUser}
                onChange={field.onChange}
              />
            </>
          )}
        />
      </div>
      <div className="col-3 p-fluid mb-2 pl-0">
        <Controller
          control={control}
          name="data_inicio"
          render={({ field }) => (
            <>
              <LabelPlus text="Data Início" />
              <Calendar
                inputId={field.name}
                {...field}
                maskSlotChar="__/__/____"
                mask="99/99/9999"
                stepMinute={10}
                showButtonBar
                todayButtonClassName="noHidden"
                hideOnDateTimeSelect
                onChange={(e) => {
                  field.onChange(e.value);
                  if (watch('data_fim') < e.value) {
                    reset({ ...watch(), data_fim: e.value });
                  }
                }}
              />
            </>
          )}
        />
      </div>
      <div className="col-3 p-fluid mb-2 pl-0">
        <Controller
          control={control}
          name="data_fim"
          render={({ field }) => (
            <>
              <LabelPlus text="Data Início" />
              <Calendar
                inputId={field.name}
                {...field}
                maskSlotChar="__/__/____"
                mask="99/99/9999"
                minDate={watch('data_inicio')}
                stepMinute={10}
                showButtonBar
                todayButtonClassName="noHidden"
                hideOnDateTimeSelect

              />
            </>
          )}
        />
      </div>
      <div className="col-3 p-fluid mb-2 pl-0">
        <Button
          label='Filtrar'
          className='mt-4'
          onClick={() => {
            handleSubmit(onSubmit)();
          }}
        />
      </div>
    </div>
  );
}

