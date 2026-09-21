import { useEffect } from 'react';
import { Dialog as Modal } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { getFormErrorMessage, msgRequired } from '@/service/Util';
import { ContactResponse, ValorCampoForm } from '@/Interfaces';
import CamposPersonalizados from '@/components/CamposPersonalizados';
import InputTelefone, { paraE164 } from '@/components/InputTelefone';
import LabelPlus from '@/components/LabelPlus';

/**
 * O que o formulário edita - subconjunto do contato.
 *
 * Nomeado em vez de usar `ContactResponse` inteiro: quem recebe o `onConfirm`
 * precisa saber que só estes campos chegam preenchidos.
 */
export type ContactFormFields = Pick<ContactResponse, 'id' | 'name' | 'phone'> & {
  /** Campos personalizados escolhidos para este contato. */
  campos?: ValorCampoForm[];
};

type ModalProps = {
  visible: boolean;
  onHide: () => void;
  data: ContactResponse;
  onConfirm: (fields: ContactFormFields) => void;
};

const defaultForm: ContactFormFields = {
  id: null,
  name: '',
  phone: '',
  campos: [],
};

const schema = yup.object({
  name: yup.string().required(msgRequired),
  phone: yup.string().notRequired(),
  // Adicionou a linha, tem que preencher: uma linha pela metade não significa
  // nada, e o backend a recusaria.
  campos: yup.array().of(
    yup.object({
      custom_field_id: yup.number().required('Escolha o campo').nullable(),
      valor: yup.string().trim().required('Informe o valor'),
    }),
  ),
});

function ModalFormulario(props: ModalProps) {
  const { visible, onHide, data, onConfirm } = props;
  const { control, handleSubmit, reset } = useForm<ContactFormFields>({
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

  const onSubmitForm = (fields: ContactFormFields) => {
    try {
      onConfirm && onConfirm(fields);
    } catch (error) {}
  };

  useEffect(() => {
    if (visible) {
      reset({
        ...defaultForm,
        ...data,
        // A API devolve `camposPersonalizados` com a relação carregada; o
        // formulário só precisa do id e do valor.
        campos: (data?.camposPersonalizados ?? []).map((v) => ({
          custom_field_id: v.custom_field_id,
          valor: v.valor,
        })),
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
                {/* O valor circula em E.164 (`+556492698043`); a conversão
                    para dígitos acontece ao salvar. A máscara nacional antiga
                    lia o `55` do país como DDD e comia dois dígitos. */}
                <InputTelefone
                  // Remonta ao abrir: o `PhoneInput` lê o país do valor só na
                  // montagem, e o modal já existe antes de o `reset` trazer os
                  // dados - sem a `key` ele ficava preso ao primeiro país da
                  // lista, com o número em branco.
                  key={data?.id ?? 'novo'}
                  id={field.name}
                  value={paraE164(field.value)}
                  onChange={(valor) => field.onChange(valor ?? '')}
                  onBlur={field.onBlur}
                  invalido={!!fieldState.error}
                />
                {getFormErrorMessage(fieldState)}
              </>
            )}
          />
        </div>

        {/* Os campos personalizados que quem edita escolher para este contato.
            O catálogo diz o que pode ser usado; a escolha é linha a linha. */}
        <div className="col-12">
          <CamposPersonalizados
            control={control}
            aplicaA="contato"
          />
        </div>
      </div>
    </Modal>
  );
}

export default ModalFormulario;
