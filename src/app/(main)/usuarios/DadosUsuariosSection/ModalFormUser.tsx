import { useEffect } from 'react';
import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { IUsuariosResponse, Shape } from '@/Interfaces';
import LabelPlus from '@/components/LabelPlus';
import InputDecimal from '@/components/InputDecimal';
import { useService } from '@/contexts/ServicesContext';
import { Alerta, CatchAlerta, getFormErrorMessage, msgRequired } from '@/service/Util';
import useApi from '@/service/Api/ApiClient'

type ModalProps = {
  visible: boolean;
  onHide: () => void;
  data: IUsuariosResponse;
  onConfirm: () => void;
};

type UsuarioForm = Omit<IUsuariosResponse, 'is_requestpassword' | 'lastlogin_at' | 'created_at'> & {
  senha?: string;
  confirma_senha?: string;
};

const defaultForm: UsuarioForm = {
  name: '',
  email: '',
  valor_hora: 0.0,
  senha: '',
  confirma_senha: '',
};

const ModalFormUser = (props: ModalProps) => {
  const { visible, onHide, data, onConfirm } = props;
  const {FetchReq, } = useApi()

  const schema = yup.object<yup.AnyObject, Shape<UsuarioForm>>({
    name: yup.string().required(msgRequired),
    email: yup.string().required(msgRequired).email('Email incorreto'),
    senha: yup.string().when('id', {
      is: () => data?.id === undefined,
      then: (schema) => schema.required(msgRequired).min(4, "Senha precisa ter mais de 4 caracteres"),
      otherwise: (schema) => schema.notRequired(),
    }),
    confirma_senha: yup
      .string()
      .oneOf([yup.ref('senha')], 'Senha não coincide')
      .when('senha', {
        is: () => data?.id === undefined,
        then: (schema) => schema.required(msgRequired).min(4, "Campo precisa ter no mínimo 4 caracteres"),
        otherwise: (schema) => schema.notRequired(),
      }),
  });

  const { control, handleSubmit, reset } = useForm<UsuarioForm>({
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema),
  });
  const { setLoading } = useService()

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

  const onSubmitForm = async (fields: UsuarioForm) => {
    try {
      setLoading(true);
      const dataPost = {
        name: fields.name,
        email: fields.email,
        valor_hora: fields.valor_hora,
      }
      if (!data?.id) {
        dataPost['password'] = fields.senha
        await FetchReq({
          endpoint: 'AdicionarUsuario',
          body: dataPost
        })
      } else {
        if (fields.senha !== '') {
          dataPost['password'] = fields.senha
        }
        await FetchReq({
          endpoint: 'AtualizarUsuario',
          body: dataPost,
          variables: [fields?.id]
        })
      }
      Alerta("Usuário salvo com sucesso!", 'Sucesso!', 'success');
      onConfirm && onConfirm();
      onHide && onHide();
    } catch (err) {
      CatchAlerta(err, 'Erro ao salvar usuário')
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      reset({
        ...defaultForm,
        ...data,
        ...(data?.valor_hora === null && { valor_hora: 0.00 }),
      });
    }
  }, [visible]);
  return (
    <>
      <Modal
        modal
        className="p-fluid"
        style={{ width: '60rem' }}
        visible={visible}
        header={(!data?.id ? 'Adicionar' : 'Alterar') + ' usuário'}
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
                  />
                  {getFormErrorMessage(fieldState)}
                </>
              )}
            />
          </div>
          <div className="col-6">
            <Controller
              control={control}
              name="valor_hora"
              render={({ field, fieldState }) => (
                <>
                  <LabelPlus
                    htmlFor={field.name}
                    text="Valor da hora"
                  />
                  <InputDecimal
                    id={field.name}
                    {...field}
                    value={field?.value?.toString()}
                    mode="decimal"
                    onChangeDecimal={field.onChange}
                    placeholder="Nome"
                  />
                  {getFormErrorMessage(fieldState)}
                </>
              )}
            />
          </div>
          <div className="col-12">
            <Controller
              control={control}
              name="email"
              render={({ field, fieldState }) => (
                <>
                  <LabelPlus
                    htmlFor={field.name}
                    text="Email"
                    required
                  />
                  <InputText
                    id={field.name}
                    {...field}
                    placeholder="exemplo@exemplo.com"
                  />
                  {getFormErrorMessage(fieldState)}
                </>
              )}
            />
          </div>
          <div className="col-6">
            <Controller
              control={control}
              name="senha"
              render={({ field, fieldState }) => (
                <>
                  <LabelPlus
                    htmlFor={field.name}
                    text="Senha"
                    required={!data?.id}
                  />
                  <InputText
                    id={field.name}
                    {...field}
                    type='password'
                  />
                  {getFormErrorMessage(fieldState)}
                </>
              )}
            />
          </div>
          <div className="col-6">
            <Controller
              control={control}
              name="confirma_senha"
              render={({ field, fieldState }) => (
                <>
                  <LabelPlus
                    htmlFor={field.name}
                    text="Confirma senha"
                    required={!data?.id}
                  />
                  <InputText
                    id={field.name}
                    {...field}
                    type='password'
                  />
                  {getFormErrorMessage(fieldState)}
                </>
              )}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ModalFormUser;

