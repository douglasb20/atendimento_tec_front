'use client';

import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';
import { InputMask } from 'primereact/inputmask';
import { InputText } from 'primereact/inputtext';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';

import LabelPlus from '@/components/LabelPlus';
import useApi from '@/service/Api/ApiClient';
import { ClientResponse, Masks } from '@/Interfaces';
import { CatchAlerta, getFormErrorMessage, msgRequired, ValidaCNPJ } from '@/service/Util';

type ModalClienteChatProps = {
  visible: boolean;
  onHide: () => void;
  /** Recebe o cliente recém-criado, para quem chamou já poder selecioná-lo. */
  onConfirm: (cliente: ClientResponse) => void;
};

type FormCliente = { nome: string; cnpj?: string };

const schema = yup.object({
  nome: yup.string().required(msgRequired),
  // Só valida se preencheram: o CNPJ é opcional.
  cnpj: yup
    .string()
    .notRequired()
    .test('cnpj', 'CNPJ inválido', (valor) => !valor?.replace(/\D/g, '') || ValidaCNPJ(valor)),
});

/**
 * Cadastro de cliente sem sair do chat.
 *
 * A tela de clientes tem um formulário equivalente, mas ele é uma página presa
 * a rota e redirecionamento - daí esta versão enxuta, com os mesmos campos.
 * Ver `app/(main)/clientes/form/[[...id]]/page.tsx`.
 */
const ModalClienteChat = ({ visible, onHide, onConfirm }: ModalClienteChatProps) => {
  const { FetchReq } = useApi();
  const [salvando, setSalvando] = useState(false);

  const { control, handleSubmit, reset } = useForm<FormCliente>({
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema),
  });

  useEffect(() => {
    if (visible) reset({ nome: '', cnpj: '' });
  }, [visible, reset]);

  const onSubmitForm = async (campos: FormCliente) => {
    try {
      setSalvando(true);

      const cliente = await FetchReq<ClientResponse>({
        endpoint: 'CriarCliente',
        body: {
          nome: campos.nome.trim(),
          // O campo é opcional: sem os dígitos, vai nulo em vez de string vazia.
          cnpj: campos.cnpj?.replace(/\D/g, '') || null,
        },
      });

      onConfirm(cliente);
      onHide();
    } catch (erro) {
      CatchAlerta(erro, 'Não foi possível cadastrar o cliente');
    } finally {
      setSalvando(false);
    }
  };

  const rodape = () => (
    <div className="flex justify-content-between">
      <Button
        label="Cancelar"
        severity="danger"
        outlined
        onClick={onHide}
        disabled={salvando}
      />
      <Button
        label="Salvar"
        loading={salvando}
        onClick={() => handleSubmit(onSubmitForm)()}
      />
    </div>
  );

  return (
    <Modal
      modal
      className="p-fluid"
      style={{ width: '40rem' }}
      breakpoints={{ '640px': '95vw' }}
      visible={visible}
      header="Novo cliente"
      onHide={onHide}
      footer={rodape}
    >
      <div className="grid">
        <div className="col-12 md:col-7">
          <Controller
            control={control}
            name="nome"
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
                  placeholder="Nome do cliente"
                  autoComplete="off"
                  autoFocus
                />
                {getFormErrorMessage(fieldState)}
              </>
            )}
          />
        </div>
        <div className="col-12 md:col-5">
          <Controller
            control={control}
            name="cnpj"
            render={({ field, fieldState }) => (
              <>
                <LabelPlus
                  htmlFor={field.name}
                  text="CNPJ"
                />
                <InputMask
                  id={field.name}
                  {...field}
                  mask={Masks.CNPJ}
                  placeholder="00.000.000/0000-00"
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
};

export default ModalClienteChat;
