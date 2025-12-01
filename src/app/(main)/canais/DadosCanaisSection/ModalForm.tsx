import { memo, useEffect } from 'react';
import { Dialog as Modal } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { useForm, Controller } from 'react-hook-form';

import { ChannelResponse } from '@/Interfaces';
import { getFormErrorMessage, msgRequired } from '@/service/Util';

interface IProps<T> {
  visible: boolean;
  value?: T;
  onHide: () => void;
  onComplete: (data: T) => void;
}

const defaultValues = {
  id: null,
  name: '',
};

const ModalForm = (props: IProps<ChannelResponse>) => {
  const { visible, onHide, value, onComplete } = props;
  const { control, handleSubmit, reset } = useForm<ChannelResponse>({
    reValidateMode: 'onBlur',
  });

  const onSubmit = async (data: ChannelResponse) => {
    onComplete && onComplete(data);
  };

  useEffect(() => {
    reset({
      ...defaultValues,
      ...value,
    });
  }, [visible, value]);

  return (
    <>
      <Modal
        resizable={false}
        header={`${value?.id ? 'Editar canal' : 'Novo canal'} `}
        visible={visible}
        className="w-11 md:w-12 lg:w-2 "
        style={{ minWidth: '10vw' }}
        onHide={onHide}
        blockScroll
        closeOnEscape={false}
      >
        <div className="formgrid grid gap-3">
          <div className="col-12 p-fluid">
            <Controller
              control={control}
              name="name"
              rules={{
                required: msgRequired,
              }}
              render={({ field, fieldState }) => (
                <>
                  <InputText {...field} />
                  {getFormErrorMessage(fieldState)}
                </>
              )}
            />
          </div>
          <div className="col-12 flex justify-content-end ">
            <Button
              label="Salvar"
              onClick={() => handleSubmit(onSubmit)()}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default memo(ModalForm);
