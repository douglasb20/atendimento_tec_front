import { useEffect } from 'react';
import { Dialog as Modal } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputMask } from 'primereact/inputmask';
import { Button } from 'primereact/button';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { getFormErrorMessage, msgRequired } from '@/service/Util';
import { ContactResponse, Masks, Shape } from '@/Interfaces';
import LabelPlus from '@/components/LabelPlus';

type ModalProps = {
  visible: boolean;
  onHide: () => void;
  data: ContactResponse;
  onConfirm: (fields: ContactResponse) => void;
};

const defaultForm: Pick<ContactResponse, 'name' | 'phone' | 'id'> = {
  id: null,
  name: '',
  phone: '',
};

const schema = yup.object<yup.AnyObject, Shape<Pick<ContactResponse, 'name' | 'phone'>>>({
  name: yup.string().required(msgRequired),
  phone: yup.string().notRequired(),
});

function ModalFormulario(props: ModalProps) {
  const { visible, onHide, data, onConfirm } = props;
  const { control, handleSubmit, reset } = useForm<ContactResponse>({
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema),
  });

  const modalFooter = () => {
    return (
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
  };

  const onSubmitForm = (fields: ContactResponse) => {
    try {
      onConfirm && onConfirm(fields);
    } catch (error) {}
  };

  useEffect(() => {
    if (visible) {
      reset({
        ...defaultForm,
        ...data,
      });
    }
  }, [visible]);
  return (
    <Modal
      modal
      className="p-fluid"
      style={{ width: '60rem' }}
      visible={visible}
      header={!data?.id ? 'Incluir Contato' : 'Alterar contato'}
      onHide={onHide}
      footer={modalFooter}
    >
      <div className="grid">
        <div className="col-6">
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <>
                <LabelPlus
                  htmlFor={field.name}
                  text="Nome"
                  required
                />
                <InputText
                  id={field.name}
                  {...field}
                  value={field?.value || ''}
                  placeholder="Nome do contato"
                  autoComplete="off"
                />
                {getFormErrorMessage(fieldState)}
              </>
            )}
          />
        </div>
        <div className="col-6">
          <Controller
            control={control}
            name="phone"
            render={({ field, fieldState }) => (
              <>
                <LabelPlus
                  htmlFor={field.name}
                  text="Telefone"
                />
                <InputMask
                  id={field.name}
                  {...field}
                  placeholder="(00) 0000-0000"
                  mask={
                    field?.value?.replace(/\D/g, '').length > 10
                      ? Masks.CELULAR
                      : Masks.FIXO_OPCIONAL
                  }
                  value={field?.value || ''}
                />
                {getFormErrorMessage(fieldState)}
              </>
            )}
          />
        </div>
      </div>
    </Modal>
  );
}

export default ModalFormulario;
