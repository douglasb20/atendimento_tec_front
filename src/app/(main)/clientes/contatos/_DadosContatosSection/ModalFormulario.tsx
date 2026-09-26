import { useEffect, useState } from 'react';
import { Checkbox } from 'primereact/checkbox';
import { Dialog as Modal } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { TabPanel, TabView } from 'primereact/tabview';
import { Tooltip } from 'primereact/tooltip';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { getFormErrorMessage, msgRequired } from '@/service/Util';
import { ContactResponse, ValorCampoForm } from '@/Interfaces';
import CamposPersonalizados from '@/components/CamposPersonalizados';
import EditorAvatarContato from '@/components/EditorAvatarContato';
import InputTelefone, { paraE164 } from '@/components/InputTelefone';
import LabelPlus from '@/components/LabelPlus';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';

/**
 * O que o formulário edita - subconjunto do contato.
 *
 * Nomeado em vez de usar `ContactResponse` inteiro: quem recebe o `onConfirm`
 * precisa saber que só estes campos chegam preenchidos.
 */
export type ContactFormFields = Pick<
  ContactResponse,
  'id' | 'name' | 'last_name' | 'phone' | 'ignore_support'
> & {
  /** Campos personalizados escolhidos para este contato. */
  campos?: ValorCampoForm[];
  /** Presente só quando um upload novo acabou de subir para o storage -
   * `EditorAvatarContato` já fez o PUT, falta o PATCH gravar a key. */
  avatarKey?: string | null;
  changedAvatar?: boolean;
};

type ModalProps = {
  visible: boolean;
  onHide: () => void;
  data: ContactResponse;
  onConfirm: (fields: ContactFormFields) => void;
  /** A foto (upload ou remoção, via `EditorAvatarContato`) persiste sozinha,
   * fora do submit deste formulário - isto avisa quem chama para atualizar
   * o estado local e a listagem. */
  onContatoAtualizado?: (contato: ContactResponse) => void;
};

const defaultForm: ContactFormFields = {
  id: null,
  name: '',
  last_name: '',
  phone: '',
  ignore_support: false,
  campos: [],
};

const schema = yup.object({
  name: yup.string().required(msgRequired),
  // Opcional: muito contato é empresa ou chega do WhatsApp com uma palavra só.
  last_name: yup.string().notRequired(),
  phone: yup.string().notRequired(),
  ignore_support: yup.boolean().notRequired(),
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
  const { visible, onHide, data, onConfirm, onContatoAtualizado } = props;

  const { podeAdicionar, podeEditar, semPermissao } = usePermissoesModulo('contact');

  // Editar exige `:update`; criar, `:add`. Sem a permissão do caso, o
  // formulário abre em somente leitura - quem tem `:view` consulta o cadastro.
  const somenteLeitura = data?.id ? !podeEditar : !podeAdicionar;

  const { control, handleSubmit, reset } = useForm<ContactFormFields>({
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema),
  });

  // Fora do react-hook-form: não é um campo digitado, é o resultado do
  // upload que `EditorAvatarContato` já fez para o storage.
  const [avatarPendente, setAvatarPendente] = useState<{
    avatarKey: string | null;
    changedAvatar: boolean;
  } | null>(null);

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
          disabled={somenteLeitura}
          title={somenteLeitura ? semPermissao : undefined}
          onClick={() => handleSubmit(onSubmitForm)()}
        />
      </div>
    );
  };

  const onSubmitForm = (fields: ContactFormFields) => {
    try {
      onConfirm &&
        onConfirm({
          ...fields,
          ...(avatarPendente?.changedAvatar && {
            avatarKey: avatarPendente.avatarKey,
            changedAvatar: true,
          }),
        });
    } catch (error) {}
  };

  useEffect(() => {
    if (visible) {
      setAvatarPendente(null);
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
      <TabView>
        <TabPanel
          header="Dados"
          leftIcon="fa-regular fa-user mr-2"
        >
      <div className="grid">
        <div className="col-12">
          <EditorAvatarContato
            contato={data}
            disabled={somenteLeitura || !data?.id}
            onChange={setAvatarPendente}
            onContatoAtualizado={onContatoAtualizado}
          />
        </div>

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
                  disabled={somenteLeitura}
                />
                {getFormErrorMessage(fieldState)}
              </>
            )}
          />
        </div>
        <div className="col-6">
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
                  placeholder="Sobrenome do contato"
                  autoComplete="off"
                  disabled={somenteLeitura}
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
                  disabled={somenteLeitura}
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
                      disabled={somenteLeitura}
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
  );
}

export default ModalFormulario;
