'use client';

import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputMask } from 'primereact/inputmask';
import { InputText } from 'primereact/inputtext';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';

import LabelPlus from '@/components/LabelPlus';
import useApi from '@/service/Api/ApiClient';
import { ClientResponse, ContactResponse, Masks } from '@/Interfaces';
import { CatchAlerta, getFormErrorMessage, msgRequired } from '@/service/Util';
import ModalClienteChat from './ModalClienteChat';

type ModalContatoChatProps = {
  visible: boolean;
  onHide: () => void;
  contato?: ContactResponse;
  /** Devolve o contato salvo, já com a relação de cliente carregada. */
  onConfirm: (contato: ContactResponse) => void;
};

type FormContato = { name: string; phone?: string; client_id?: number | null };

const schema = yup.object({
  name: yup.string().required(msgRequired),
  phone: yup.string().notRequired(),
  client_id: yup.number().nullable().notRequired(),
});

/**
 * Edição do contato de dentro do chat, com o vínculo de cliente.
 *
 * Espelha `clientes/contatos/_DadosContatosSection/ModalFormulario.tsx`, que
 * não serve aqui por dois motivos: não tem o campo de cliente e seu `onConfirm`
 * nunca chegou a persistir nada. Mantidos separados para não mexer numa tela em
 * uso; a convergência seria extrair só os campos num componente comum.
 */
const ModalContatoChat = ({ visible, onHide, contato, onConfirm }: ModalContatoChatProps) => {
  const { FetchReq } = useApi();
  const [clientes, setClientes] = useState<ClientResponse[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [modalClienteAberto, setModalClienteAberto] = useState(false);

  const { control, handleSubmit, reset, setValue } = useForm<FormContato>({
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema),
  });

  useEffect(() => {
    if (!visible) return;

    reset({
      name: contato?.name ?? '',
      phone: contato?.phone ?? '',
      client_id: contato?.client_id ?? null,
    });

    FetchReq<ClientResponse[]>('ListarClientes')
      .then((lista) => setClientes(Array.isArray(lista) ? lista : []))
      .catch((erro) => CatchAlerta(erro, 'Não foi possível carregar os clientes'));
  }, [visible]);

  /** O cliente recém-criado entra na lista e já fica escolhido. */
  const aoCriarCliente = (cliente: ClientResponse) => {
    setClientes((atuais) => [cliente, ...atuais]);
    setValue('client_id', cliente.id, { shouldValidate: true });
  };

  const onSubmitForm = async (campos: FormContato) => {
    try {
      setSalvando(true);

      const salvo = await FetchReq<ContactResponse>({
        endpoint: 'AtualizarContato',
        variables: [contato.id],
        body: {
          name: campos.name.trim(),
          phone: campos.phone?.replace(/\D/g, '') || null,
          ...(campos.client_id && { client_id: campos.client_id }),
        },
      });

      onConfirm(salvo);
      onHide();
    } catch (erro) {
      CatchAlerta(erro, 'Não foi possível salvar o contato');
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
    <>
      <Modal
        modal
        className="p-fluid"
        style={{ width: '45rem' }}
        breakpoints={{ '640px': '95vw' }}
        visible={visible}
        header="Dados do contato"
        onHide={onHide}
        footer={rodape}
      >
        <div className="grid">
          <div className="col-12 md:col-7">
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

          <div className="col-12 md:col-5">
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
                    placeholder="(00) 00000-0000"
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

          <div className="col-12">
            <Controller
              control={control}
              name="client_id"
              render={({ field, fieldState }) => (
                <>
                  <LabelPlus
                    htmlFor={field.name}
                    text="Cliente"
                  />
                  {/* O botão ao lado abre o cadastro por cima deste modal: sem
                      isso, associar um cliente novo obrigaria a sair do chat. */}
                  <div className="flex gap-2">
                    <Dropdown
                      id={field.name}
                      value={field.value}
                      onChange={(e) => field.onChange(e.value)}
                      options={clientes.map((c) => ({ label: c.nome, value: c.id }))}
                      placeholder="Selecione o cliente"
                      filter
                      showClear
                      emptyMessage="Nenhum cliente cadastrado"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      icon="fa-regular fa-plus"
                      outlined
                      tooltip="Cadastrar novo cliente"
                      tooltipOptions={{ position: 'left' }}
                      onClick={() => setModalClienteAberto(true)}
                    />
                  </div>
                  {getFormErrorMessage(fieldState)}
                </>
              )}
            />
          </div>
        </div>
      </Modal>

      <ModalClienteChat
        visible={modalClienteAberto}
        onHide={() => setModalClienteAberto(false)}
        onConfirm={aoCriarCliente}
      />
    </>
  );
};

export default ModalContatoChat;
