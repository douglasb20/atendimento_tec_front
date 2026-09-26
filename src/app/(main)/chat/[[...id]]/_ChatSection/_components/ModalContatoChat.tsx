'use client';

import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog as Modal } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputMask } from 'primereact/inputmask';
import { InputText } from 'primereact/inputtext';
import { TabPanel, TabView } from 'primereact/tabview';
import { Tooltip } from 'primereact/tooltip';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';

import EditorAvatarContato from '@/components/EditorAvatarContato';
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
  /** Aberto a partir do aviso "associe um cliente" (painel de detalhes ou
   * modal de finalização) - destaca o campo Cliente, para não parecer que o
   * clique abriu "o formulário inteiro" sem relação com o que foi pedido. */
  focarCliente?: boolean;
};

type FormContato = {
  name: string;
  last_name?: string | null;
  phone?: string;
  client_id?: number | null;
  has_no_client?: boolean;
  ignore_support?: boolean;
};

const schema = yup.object({
  name: yup.string().required(msgRequired),
  last_name: yup.string().notRequired(),
  phone: yup.string().notRequired(),
  client_id: yup.number().nullable().notRequired(),
  has_no_client: yup.boolean().notRequired(),
  ignore_support: yup.boolean().notRequired(),
});

/**
 * Edição do contato de dentro do chat, com o vínculo de cliente.
 *
 * Espelha `clientes/contatos/_DadosContatosSection/ModalFormulario.tsx`, que
 * não serve aqui por dois motivos: não tem o campo de cliente e seu `onConfirm`
 * nunca chegou a persistir nada. Mantidos separados para não mexer numa tela em
 * uso; a convergência seria extrair só os campos num componente comum.
 */
const ModalContatoChat = ({
  visible,
  onHide,
  contato,
  onConfirm,
  focarCliente,
}: ModalContatoChatProps) => {
  const { FetchReq } = useApi();
  const [clientes, setClientes] = useState<ClientResponse[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [modalClienteAberto, setModalClienteAberto] = useState(false);
  // A remoção do avatar (dentro de `EditorAvatarContato`) persiste sozinha e
  // devolve o contato atualizado - guardado aqui para o preview refletir na
  // hora, sem esperar o resto do formulário ser salvo.
  const [contatoAtual, setContatoAtual] = useState(contato);
  const [avatarPendente, setAvatarPendente] = useState<{
    avatarKey: string | null;
    changedAvatar: boolean;
  } | null>(null);

  const { control, handleSubmit, reset, setValue, watch } = useForm<FormContato>({
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema),
  });

  const semCliente = watch('has_no_client');

  useEffect(() => {
    if (!visible) return;

    setContatoAtual(contato);
    setAvatarPendente(null);

    reset({
      name: contato?.name ?? '',
      last_name: contato?.last_name ?? '',
      phone: contato?.phone ?? '',
      client_id: contato?.client_id ?? null,
      has_no_client: contato?.has_no_client ?? false,
      ignore_support: contato?.ignore_support ?? false,
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
          last_name: campos.last_name?.trim() || null,
          phone: campos.phone?.replace(/\D/g, '') || null,
          ...(campos.client_id && { client_id: campos.client_id }),
          has_no_client: Boolean(campos.has_no_client),
          ignore_support: Boolean(campos.ignore_support),
          ...(avatarPendente?.changedAvatar && {
            avatar_url: avatarPendente.avatarKey,
            changed_avatar: true,
          }),
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
        header={focarCliente ? 'Associar cliente ao contato' : 'Dados do contato'}
        onHide={onHide}
        footer={rodape}
      >
        <TabView>
          <TabPanel
            header="Dados"
            leftIcon="fa-regular fa-user mr-2"
          >
        <div className="grid">
          <div className="col-12">
            <EditorAvatarContato
              contato={contatoAtual}
              onChange={setAvatarPendente}
              onContatoAtualizado={(atualizado) => {
                setContatoAtual(atualizado);
                onConfirm(atualizado);
              }}
            />
          </div>

          <div className="col-12 md:col-4">
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

          <div className="col-12 md:col-3">
            <Controller
              control={control}
              name="last_name"
              render={({ field, fieldState }) => (
                <>
                  <LabelPlus
                    htmlFor={field.name}
                    text="Sobrenome"
                  />
                  <InputText
                    id={field.name}
                    {...field}
                    value={field?.value || ''}
                    placeholder="Sobrenome"
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
                      disabled={semCliente}
                      emptyMessage="Nenhum cliente cadastrado"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      icon="fa-regular fa-plus"
                      outlined
                      disabled={semCliente}
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

          <div className="col-12">
            <Controller
              control={control}
              name="has_no_client"
              render={({ field }) => (
                <div className="flex align-items-center gap-2">
                  <Checkbox
                    inputId={field.name}
                    checked={Boolean(field.value)}
                    onChange={(e) => {
                      field.onChange(e.checked);
                      // Marcar isenta de cliente - o vínculo, se houver,
                      // deixa de fazer sentido (é ou um, ou o outro).
                      if (e.checked) setValue('client_id', null);
                    }}
                  />
                  <label
                    htmlFor={field.name}
                    className="cursor-pointer"
                  >
                    Contato sem cliente (fornecedor, parceiro etc - dispensa
                    vínculo com cliente para finalizar atendimento)
                  </label>
                </div>
              )}
            />
          </div>
        </div>
          </TabPanel>

          <TabPanel
            header="Configurações"
            leftIcon="fa-regular fa-gear mr-2"
          >
            <div className="grid">
              <div className="col-12">
                <Controller
                  control={control}
                  name="ignore_support"
                  render={({ field }) => (
                    <div className="flex align-items-center gap-2">
                      <Checkbox
                        inputId={field.name}
                        checked={Boolean(field.value)}
                        onChange={(e) => field.onChange(e.checked)}
                      />
                      <label
                        htmlFor={field.name}
                        className="cursor-pointer"
                      >
                        Ignorar atendimento
                      </label>
                      <i
                        className="tooltip-ignorar-atendimento pi pi-info-circle text-sm text-primary"
                        data-pr-tooltip="Mensagens deste contato são descartadas - não geram conversa nem protocolo."
                        data-pr-position="right"
                      />
                      <Tooltip target=".tooltip-ignorar-atendimento" />
                    </div>
                  )}
                />
              </div>
            </div>
          </TabPanel>
        </TabView>
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
