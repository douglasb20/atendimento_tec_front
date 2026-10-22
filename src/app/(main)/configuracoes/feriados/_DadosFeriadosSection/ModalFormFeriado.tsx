import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dialog as Modal } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';

import LabelPlus from '@/components/LabelPlus';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';
import { HolidayResponse, Shape } from '@/Interfaces';
import { getFormErrorMessage, msgRequired } from '@/service/Util';

export type FormFeriado = { name: string; recurring: boolean; date: Date | null };

type ModalProps = {
  visible: boolean;
  onHide: () => void;
  data: HolidayResponse | null;
  onConfirm: (fields: FormFeriado) => void;
};

/** Ano arbitrário só para preencher o `date` quando o feriado é recorrente -
 * nunca aparece na tela (dois Dropdowns, sem Calendar), nem é gravado. */
const anoNeutro = new Date().getFullYear();

const MESES = [
  { id: 1, name: 'Janeiro' }, { id: 2, name: 'Fevereiro' }, { id: 3, name: 'Março' },
  { id: 4, name: 'Abril' }, { id: 5, name: 'Maio' }, { id: 6, name: 'Junho' },
  { id: 7, name: 'Julho' }, { id: 8, name: 'Agosto' }, { id: 9, name: 'Setembro' },
  { id: 10, name: 'Outubro' }, { id: 11, name: 'Novembro' }, { id: 12, name: 'Dezembro' },
];

/** Quantidade de dias do mês escolhido, no ano neutro - evita oferecer "31"
 * para fevereiro. Ano neutro não é bissexto, então fevereiro fica em 28; não
 * há feriado nacional em 29/02, então essa perda não importa aqui. */
const diasDoMes = (mes: number): number[] =>
  Array.from({ length: new Date(anoNeutro, mes, 0).getDate() }, (_, i) => i + 1);

const defaultForm: FormFeriado = { name: '', recurring: true, date: null };

const schema = yup.object<yup.AnyObject, Shape<FormFeriado>>({
  name: yup.string().required(msgRequired).max(120, 'Máximo de 120 caracteres'),
  recurring: yup.boolean().required(),
  date: yup.date().required(msgRequired).nullable(),
});

function ModalFormFeriado({ visible, onHide, data, onConfirm }: ModalProps) {
  const { podeAdicionar, podeEditar, semPermissao } = usePermissoesModulo('holiday');
  const somenteLeitura = data?.id ? !podeEditar : !podeAdicionar;
  // Feriado nacional (seed): data e recorrência são fixas por lei - só o
  // nome pode ser alterado, mesma regra que o `HolidaysService` aplica.
  const dataTravada = !!data?.is_system;

  const { control, handleSubmit, watch, reset, setValue, getValues } = useForm<FormFeriado>({
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema),
  });

  const recurring = watch('recurring');

  /** Ao virar recorrente, zera o ano guardado em `date` para o neutro - ele
   * nunca aparece na tela nesse modo, mas evita um ano de outro contexto
   * (ex.: 2027 de um feriado móvel) sobreviver escondido no estado. */
  const alternarRecorrencia = (novoValor: boolean) => {
    setValue('recurring', novoValor);

    if (novoValor) {
      const atual = getValues('date');
      if (atual) setValue('date', new Date(anoNeutro, atual.getMonth(), atual.getDate()));
    }
  };

  useEffect(() => {
    if (!visible) return;

    reset(
      data
        ? {
            name: data.name,
            recurring: data.recurring,
            date: new Date(data.recurring ? anoNeutro : data.year, data.month - 1, data.day),
          }
        : defaultForm,
    );
  }, [visible, data, reset]);

  return (
    <Modal
      modal
      className="p-fluid"
      style={{ width: '28rem' }}
      breakpoints={{ '640px': '95vw' }}
      visible={visible}
      header={!data?.id ? 'Novo feriado' : 'Alterar feriado'}
      onHide={onHide}
      footer={
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
      }
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
                placeholder="Natal, Carnaval…"
                autoFocus
                disabled={somenteLeitura}
              />
              {getFormErrorMessage(fieldState)}
            </div>
          )}
        />

        <Controller
          control={control}
          name="recurring"
          render={({ field }) => (
            <div className="flex align-items-center gap-2">
              <InputSwitch
                inputId={field.name}
                checked={field.value}
                onChange={(e) => alternarRecorrencia(!!e.value)}
                disabled={somenteLeitura || dataTravada}
              />
              <label htmlFor={field.name}>Repete todo ano</label>
            </div>
          )}
        />

        <Controller
          control={control}
          name="date"
          render={({ field, fieldState }) => (
            <div>
              <LabelPlus
                htmlFor={field.name}
                text={recurring ? 'Dia e mês' : 'Data'}
                textHelp={
                  dataTravada
                    ? 'Feriado nacional - a data é fixa por lei e não pode ser alterada'
                    : recurring
                      ? 'Feriado fixo (ex.: Natal) - vale para sempre, o ano não importa'
                      : 'Feriado móvel (ex.: Páscoa, Carnaval) - a data muda a cada ano'
                }
                required
              />

              {recurring ? (
                // Dois Dropdowns em vez do Calendar: ele não tem modo "só
                // dia/mês" - mesmo escondendo o ano visualmente, o botão de
                // navegar por ano continua ali por baixo. Mês+Dia aqui não
                // deixa nenhum resquício de ano na tela.
                <div className="flex gap-2">
                  <Dropdown
                    inputId={field.name}
                    value={(field.value ?? new Date(anoNeutro, 0, 1)).getDate()}
                    onChange={(e) => {
                      const atual = field.value ?? new Date(anoNeutro, 0, 1);
                      field.onChange(new Date(anoNeutro, atual.getMonth(), e.value));
                    }}
                    options={diasDoMes((field.value ?? new Date(anoNeutro, 0, 1)).getMonth() + 1)}
                    placeholder="Dia"
                    className="w-8rem"
                    disabled={somenteLeitura || dataTravada}
                  />
                  <Dropdown
                    value={(field.value ?? new Date(anoNeutro, 0, 1)).getMonth() + 1}
                    onChange={(e) => {
                      const atual = field.value ?? new Date(anoNeutro, 0, 1);
                      const novoDia = Math.min(atual.getDate(), diasDoMes(e.value).length);
                      field.onChange(new Date(anoNeutro, e.value - 1, novoDia));
                    }}
                    options={MESES}
                    optionLabel="name"
                    optionValue="id"
                    placeholder="Mês"
                    className="flex-1"
                    disabled={somenteLeitura || dataTravada}
                  />
                </div>
              ) : (
                <Calendar
                  inputId={field.name}
                  value={field.value}
                  onChange={(e) => field.onChange(e.value as Date)}
                  dateFormat="dd/mm/yy"
                  showIcon
                  disabled={somenteLeitura || dataTravada}
                />
              )}

              {getFormErrorMessage(fieldState)}
            </div>
          )}
        />
      </div>
    </Modal>
  );
}

export default ModalFormFeriado;
