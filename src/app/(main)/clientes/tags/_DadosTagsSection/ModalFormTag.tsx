import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from 'primereact/button';
import { ColorPicker } from 'primereact/colorpicker';
import { Dialog as Modal } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { SelectButton } from 'primereact/selectbutton';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';

import ChipTag from '@/components/ChipTag';
import LabelPlus from '@/components/LabelPlus';
import { Shape, TagResponse } from '@/Interfaces';
import { corDoTextoSobre, getFormErrorMessage, msgRequired } from '@/service/Util';

type FormTag = { id?: number; name: string; color: string; text_color: 'light' | 'dark' };

type ModalProps = {
  visible: boolean;
  onHide: () => void;
  data: TagResponse | null;
  onConfirm: (fields: FormTag) => void;
};

const defaultForm: FormTag = {
  id: null,
  name: '',
  // Um valor inicial evita o ColorPicker abrir em preto, que ninguém escolhe de
  // propósito e vira a cor de metade das etiquetas.
  color: '#6366f1',
  text_color: 'light',
};

const OPCOES_TEXTO = [
  { label: 'Claro', value: 'light' as const },
  { label: 'Escuro', value: 'dark' as const },
];

const schema = yup.object<yup.AnyObject, Shape<Pick<FormTag, 'name' | 'color' | 'text_color'>>>({
  name: yup.string().required(msgRequired).max(60, 'Máximo de 60 caracteres'),
  color: yup.string().required(msgRequired),
  text_color: yup.string().oneOf(['light', 'dark']).required(msgRequired),
});

/** Qual cor de texto dá mais contraste sobre o fundo escolhido. */
const sugereCorDoTexto = (cor: string): 'light' | 'dark' =>
  corDoTextoSobre(cor.startsWith('#') ? cor : `#${cor}`) === '#ffffff' ? 'light' : 'dark';

/** Garante o `#` que o ColorPicker omite e o backend exige. */
const comCerquilha = (cor?: string) => {
  const limpa = (cor ?? '').replace('#', '');
  return limpa ? `#${limpa}` : '';
};

function ModalFormTag({ visible, onHide, data, onConfirm }: ModalProps) {
  const { control, handleSubmit, reset, watch, setValue } = useForm<FormTag>({
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema),
  });

  // A prévia acompanha o que está sendo escolhido: a cor sozinha no seletor não
  // diz como a etiqueta vai ficar na conversa.
  const previa = {
    name: watch('name') || 'Etiqueta',
    color: comCerquilha(watch('color')),
    text_color: watch('text_color') ?? 'light',
  };

  useEffect(() => {
    if (visible) reset({ ...defaultForm, ...(data ?? {}) });
  }, [visible, data, reset]);

  const onSubmitForm = (fields: FormTag) => {
    onConfirm?.({ ...fields, color: comCerquilha(fields.color) });
  };

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
        onClick={() => handleSubmit(onSubmitForm)()}
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
      header={!data?.id ? 'Nova etiqueta' : 'Alterar etiqueta'}
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
                placeholder="Premium, Contrato anual…"
                autoFocus
              />
              {getFormErrorMessage(fieldState)}
            </div>
          )}
        />

        <Controller
          control={control}
          name="color"
          render={({ field, fieldState }) => (
            <div>
              <LabelPlus
                htmlFor={field.name}
                text="Cor"
                required
              />
              {/* Fora do `p-fluid` do Modal: dentro dele o seletor estica para
                  a largura toda e fica desproporcional. */}
              <div className="flex align-items-center gap-3">
                <ColorPicker
                  id={field.name}
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e.value);
                    // Sugere a cor de texto que dá mais contraste; é só um
                    // ponto de partida, e o seletor abaixo permite trocar.
                    setValue('text_color', sugereCorDoTexto(String(e.value ?? '')));
                  }}
                  format="hex"
                />
                <ChipTag tag={previa} />
              </div>
              {getFormErrorMessage(fieldState)}
            </div>
          )}
        />

        <Controller
          control={control}
          name="text_color"
          render={({ field }) => (
            <div>
              <LabelPlus
                htmlFor={field.name}
                text="Cor do texto"
                textHelp="Escolha o que ler melhor sobre a cor de fundo"
              />
              {/* Num `div` próprio e com `w-auto`: o `p-fluid` do Modal
                  esticaria os dois botões pela largura toda, como faz com o
                  seletor de cor acima. */}
              <div className="flex">
                <SelectButton
                  id={field.name}
                  value={field.value}
                  onChange={(e) => e.value && field.onChange(e.value)}
                  options={OPCOES_TEXTO}
                  allowEmpty={false}
                  pt={{ button: { className: 'p-button-sm w-auto' } }}
                />
              </div>
            </div>
          )}
        />
      </div>
    </Modal>
  );
}

export default ModalFormTag;
