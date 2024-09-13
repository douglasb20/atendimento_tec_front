import { useEffect } from 'react';
import { Dialog as Modal } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputMask } from 'primereact/inputmask';
import { Button } from 'primereact/button';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { getFormErrorMessage, msgRequired } from '@/service/Util';
import { ContactTable, Masks, Shape } from '@/Interfaces';
import LabelPlus from '@/components/LabelPlus';

type ModalProps = {
  visible: boolean;
  onHide: () => void;
  data: ContactTable;
  onConfirm: (fields: ContactTable) => void;
};

const defaultForm: ContactTable = {
  id: null,
  nome_contato: '',
  telefone_contato: '',
};

const schema = yup.object<yup.AnyObject, Shape<ContactTable>>({
  nome_contato: yup.string().required(msgRequired),
  telefone_contato: yup.string().notRequired()
})

function ModalFormulario(props: ModalProps) {
  const { visible, onHide, data, onConfirm } = props;
  const { control, handleSubmit, reset } = useForm<ContactTable>({
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema)
  });

  const modalFooter = () => {
    return (
      <div className="flex justify-content-between">
        <Button
          label="Cancelar"
          size="small"
          severity="danger"
          outlined
        />
        <Button
          label="Salvar"
          size="small"
          onClick={() => handleSubmit(onSubmitForm)()}
        />
      </div>
    );
  };

  const onSubmitForm = (fields: ContactTable) => {
    onConfirm && onConfirm(fields);
  }

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
            name="nome_contato"
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
                  placeholder="Nome do contato"
                />
                {getFormErrorMessage(fieldState)}
              </>
            )}
          />
        </div>
        <div className="col-6">
          <Controller
            control={control}
            name="telefone_contato"
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
                    field.value.replace(/\D/g, '').length > 10 ? Masks.CELULAR : Masks.FIXO_OPCIONAL
                  }
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
