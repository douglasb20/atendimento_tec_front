'use client';
import { memo, useEffect, useState } from 'react';
import { Dialog as Modal } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { classNames } from 'primereact/utils';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { useService } from 'contexts/ServicesContext';
import { AlertaCallback, CatchAlerta, getFormErrorMessage, msgRequired } from 'service/Util';
import LabelPlus from 'components/LabelPlus';
import { Shape } from 'Interfaces';
import ApiClient from 'service/Api/ApiClient';

interface IForm {
  senhaAtual: string;
  novaSenha: string;
  confirmaNovaSenha: string;
}

const schema = yup.object<yup.AnySchema, Shape<Partial<IForm>>>({
  senhaAtual: yup.string().required(msgRequired),
  novaSenha: yup.string().required(msgRequired).min(4, 'A senha deve ter mais de 4 caracteres'),
  confirmaNovaSenha: yup
    .string()
    .oneOf([yup.ref('novaSenha')], 'Senha não confere')
    .required(msgRequired)
    .min(4, 'A senha deve ter mais de 4 caracteres'),
});

const ModalAlteraSenha = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { control, reset, handleSubmit } = useForm<IForm>({
    defaultValues: {
      senhaAtual: '',
      novaSenha: '',
      confirmaNovaSenha: '',
    },
    shouldFocusError: false,
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema),
  });
  const { modalPasswordVisible, setModalPasswordVisible, setLoading } = useService();
  const { req, ...Api } = ApiClient();

  const modalSenhaFooter = () => {
    return (
      <div className={`mt-1 `}>
        <Button
          type="button"
          className="p-button-sm"
          label={`Salvar`}
          onClick={() => handleSubmit(onComplete)()}
        />
      </div>
    );
  };

  const onComplete = async (data: IForm) => {
    try {
      setLoading(true);
      await req.put(Api.ChangePassword, { ...data });
      AlertaCallback('Senha alterada com sucesso', () => setModalPasswordVisible(false), 'success');
    } catch (error) {
      CatchAlerta(error, 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reset();
  }, [modalPasswordVisible]);

  return (
    <>
      <Modal
        footer={modalSenhaFooter}
        resizable={false}
        header={`Alteração de senha`}
        visible={modalPasswordVisible}
        className="w-11 md:w-2"
        style={{ minWidth: '35rem' }}
        onHide={() => setModalPasswordVisible(false)}
        blockScroll
        closeOnEscape={false}
      >
        <div className="formgrid grid p-fluid">
          <div className="field col-12">
            <Controller
              control={control}
              name="senhaAtual"
              render={({ field, fieldState }) => {
                return (
                  <>
                    <LabelPlus
                      htmlFor={field.name}
                      text="Senha Atual"
                      required
                    />
                    <span className="p-input-icon-right">
                      <i
                        className={`pi pi-eye${!showPassword ? '' : '-slash'}`}
                        onClick={() => setShowPassword((prev) => !prev)}
                      />
                      <InputText
                        id={field.name}
                        className={classNames('p-inputtext-sm', {
                          'p-invalid': fieldState.invalid,
                        })}
                        type={showPassword ? 'text' : 'password'}
                        {...field}
                      />
                    </span>
                    {getFormErrorMessage(fieldState)}
                  </>
                );
              }}
            />
          </div>
          <div className="field col-12">
            <Controller
              control={control}
              name="novaSenha"
              render={({ field, fieldState }) => {
                return (
                  <>
                    <LabelPlus
                      htmlFor={field.name}
                      text="Nova senha"
                      required
                    />
                    <span className="p-input-icon-right">
                      <i
                        className={`pi pi-eye${!showPassword ? '' : '-slash'}`}
                        onClick={() => setShowPassword((prev) => !prev)}
                      />
                      <InputText
                        id={field.name}
                        className={classNames('p-inputtext-sm', {
                          'p-invalid': fieldState.invalid,
                        })}
                        type={showPassword ? 'text' : 'password'}
                        {...field}
                      />
                    </span>
                    {getFormErrorMessage(fieldState)}
                  </>
                );
              }}
            />
          </div>
          <div className="field col-12">
            <Controller
              control={control}
              name="confirmaNovaSenha"
              render={({ field, fieldState }) => {
                return (
                  <>
                    <LabelPlus
                      htmlFor={field.name}
                      text="Confirma senha"
                      required
                    />

                    <span className="p-input-icon-right">
                      <i
                        className={`pi pi-eye${!showPassword ? '' : '-slash'}`}
                        onClick={() => setShowPassword((prev) => !prev)}
                      />
                      <InputText
                        id={field.name}
                        className={classNames('p-inputtext-sm', {
                          'p-invalid': fieldState.invalid,
                        })}
                        type={showPassword ? 'text' : 'password'}
                        {...field}
                      />
                    </span>
                    {getFormErrorMessage(fieldState)}
                  </>
                );
              }}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default memo(ModalAlteraSenha);
