import { yupResolver } from '@hookform/resolvers/yup';
import { classNames } from 'primereact/utils';
import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';

import LabelPlus from '@/components/LabelPlus';
import {
  IntegrationProviderResponse,
  IntegrationResponse,
  Shape,
  TesteConexaoResponse,
} from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { getFormErrorMessage, msgRequired } from '@/service/Util';

export type FormIntegracao = {
  integration_provider_id: number;
  name: string;
  base_url: string;
  webhook_url: string;
  /** Vazio ao editar significa "manter a que já está gravada". */
  api_key: string;
  is_default: boolean;
  is_active: boolean;
};

type ModalProps = {
  visible: boolean;
  onHide: () => void;
  data: IntegrationResponse | null;
  providers: IntegrationProviderResponse[];
  onConfirm: (fields: FormIntegracao) => void;
};

const defaultForm: FormIntegracao = {
  integration_provider_id: null,
  name: '',
  base_url: '',
  webhook_url: '',
  api_key: '',
  is_default: false,
  is_active: true,
};

const schema = yup.object<
  yup.AnyObject,
  Shape<Pick<FormIntegracao, 'integration_provider_id' | 'name'>>
>({
  integration_provider_id: yup.number().required(msgRequired).typeError(msgRequired),
  name: yup.string().required(msgRequired).max(100, 'Máximo de 100 caracteres'),
});

/**
 * Sugere a URL de webhook a partir de onde a API está publicada.
 *
 * É o valor certo na maioria dos casos, mas não em todos — daí ser sugestão e
 * não imposição: com a Evolution em container e o backend no host, `localhost`
 * dentro do container é o próprio container, e o endereço tem de ser o IP do
 * gateway Docker.
 */
const webhookSugerido = () => {
  const base = (process.env.URL_ENDPOINT ?? '').replace(/\/+$/, '').replace(/\/api$/, '');
  return base ? `${base}/api/whatsapp/webhook` : '';
};

function ModalFormIntegracao({ visible, onHide, data, providers, onConfirm }: ModalProps) {
  const { control, handleSubmit, reset, watch, setValue } = useForm<FormIntegracao>({
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema),
  });
  const { FetchReq } = useApi();

  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState<TesteConexaoResponse | null>(null);
  const [revelada, setRevelada] = useState(false);
  const [carregandoChave, setCarregandoChave] = useState(false);

  const editando = Boolean(data?.id);
  const providerId = watch('integration_provider_id');
  const slugSelecionado = providers.find((p) => p.id === providerId)?.slug;

  useEffect(() => {
    setResultado(null);
    setRevelada(false);

    if (data) {
      reset({
        integration_provider_id: data.integration_provider_id,
        name: data.name,
        base_url: data.base_url ?? '',
        webhook_url: data.webhook_url ?? '',
        // Preenchida logo abaixo, por um endpoint à parte: a chave não vem na
        // listagem nem no `findOne` (a coluna é `select: false`), então sai do
        // banco só quando um formulário de edição é aberto.
        api_key: '',
        is_default: data.is_default,
        is_active: data.is_active,
      });

      carregarCredencial(data.id);
      return;
    }

    reset({ ...defaultForm, webhook_url: webhookSugerido() });
  }, [data, visible, reset]);

  /**
   * Carrega a credencial gravada para o campo.
   *
   * Vem de um endpoint próprio (`/:id/credenciais`, exigindo
   * `integration:update`) e não da listagem: assim a chave sai do banco só ao
   * abrir a edição, e o acesso fica no log de auditoria. Falhar aqui não é
   * erro de tela — sem permissão, o campo simplesmente segue vazio e continua
   * valendo a regra de "preencha para substituir".
   */
  const carregarCredencial = async (id: number) => {
    try {
      setCarregandoChave(true);
      const credenciais = await FetchReq<Record<string, string>>({
        endpoint: 'RevelarCredenciaisIntegracao',
        variables: [id],
      });

      if (credenciais?.apiKey) setValue('api_key', credenciais.apiKey);
    } catch {
      // Silencioso de propósito: ver a chave é conveniência, não requisito.
    } finally {
      setCarregandoChave(false);
    }
  };

  /**
   * Testa antes de salvar, com o que está digitado no formulário.
   *
   * Descobrir a apikey errada aqui evita o caminho longo: salvar, criar canal,
   * tentar conectar e só então ver a falha — sem saber se o problema é a
   * credencial, o endereço ou o canal.
   */
  const testarConexao = async () => {
    try {
      setTestando(true);
      setResultado(null);

      const apiKey = watch('api_key')?.trim();

      const resposta = await FetchReq<TesteConexaoResponse>({
        endpoint: 'TestarConexaoIntegracao',
        body: {
          ...(data?.id && { integration_id: data.id }),
          ...(slugSelecionado && { slug: slugSelecionado }),
          ...(watch('base_url')?.trim() && { base_url: watch('base_url').trim() }),
          // Sem chave digitada numa integração existente, o backend usa a
          // gravada — é o caso de conferir uma integração já cadastrada.
          ...(apiKey && { credentials: { apiKey } }),
        },
      });

      setResultado(resposta);
    } catch (err) {
      setResultado({ ok: false, mensagem: 'Não foi possível executar o teste.' });
    } finally {
      setTestando(false);
    }
  };

  const podeTestar = Boolean(providerId) && (Boolean(watch('base_url')?.trim()) || editando);

  const rodape = (
    <div className="flex align-items-center justify-content-between w-full">
      <Button
        label="Testar conexão"
        icon="fa-regular fa-plug-circle-check"
        outlined
        size="small"
        loading={testando}
        disabled={!podeTestar}
        onClick={testarConexao}
        tooltip={podeTestar ? undefined : 'Escolha o provider e informe o endereço'}
        tooltipOptions={{ position: 'top', showOnDisabled: true }}
      />

      <div className="flex gap-2">
        <Button
          label="Cancelar"
          text
          onClick={onHide}
          disabled={testando}
        />
        <Button
          label="Salvar"
          icon="fa-regular fa-check"
          onClick={handleSubmit(onConfirm)}
        />
      </div>
    </div>
  );

  return (
    <Modal
      visible={visible}
      onHide={onHide}
      header={editando ? 'Editar integração' : 'Nova integração'}
      footer={rodape}
      style={{ width: '42rem' }}
      breakpoints={{ '960px': '90vw' }}
      draggable={false}
      blockScroll
    >
      <div className="p-fluid formgrid grid pt-2">
        <div className="field col-12 md:col-5">
          <LabelPlus
            text="Provider"
            required
          />
          <Controller
            control={control}
            name="integration_provider_id"
            render={({ field, fieldState }) => (
              <>
                <Dropdown
                  {...field}
                  options={providers}
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Selecione"
                  // Trocar o provider de uma integração em uso mudaria o
                  // formato esperado das credenciais já gravadas.
                  disabled={editando}
                  className={fieldState.error ? 'p-invalid' : ''}
                />
                {getFormErrorMessage(fieldState)}
              </>
            )}
          />
        </div>

        <div className="field col-12 md:col-7">
          <LabelPlus
            text="Nome"
            required
          />
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <>
                <InputText
                  {...field}
                  placeholder="Ex.: Evolution principal"
                  className={fieldState.error ? 'p-invalid' : ''}
                />
                {getFormErrorMessage(fieldState)}
              </>
            )}
          />
        </div>

        <div className="field col-12">
          <LabelPlus text="Endereço da API" />
          <Controller
            control={control}
            name="base_url"
            render={({ field }) => (
              <InputText
                {...field}
                placeholder="http://172.17.0.1:8080"
              />
            )}
          />
          <small className="text-500">Como este servidor alcança o provider.</small>
        </div>

        <div className="field col-12">
          <LabelPlus
            text="API Key"
            required={!editando}
            textHelp="É a chave global do provider (AUTHENTICATION_API_KEY, no caso da Evolution), não o token de uma instância: criar instância só é aceito com ela. O token de cada instância o sistema obtém sozinho ao conectar o canal."
          />
          <Controller
            control={control}
            name="api_key"
            render={({ field }) => (
              <IconField iconPosition="right">
                <InputIcon
                  className={classNames(
                    'cursor-pointer',
                    revelada ? 'pi pi-eye-slash' : 'pi pi-eye',
                  )}
                  onClick={() => setRevelada((atual) => !atual)}
                  role="button"
                  tabIndex={0}
                  aria-label={revelada ? 'Ocultar a chave' : 'Mostrar a chave'}
                  title={revelada ? 'Ocultar' : 'Mostrar'}
                />
                <InputText
                  {...field}
                  // Alternar entre `text` e `password` no mesmo input, em vez de
                  // renderizar dois: trocar de elemento faria o campo perder o
                  // foco e o cursor a cada clique no olho.
                  type={revelada ? 'text' : 'password'}
                  autoComplete="off"
                  placeholder={
                    carregandoChave ? 'Carregando…' : 'Chave global do provider'
                  }
                />
              </IconField>
            )}
          />
          <small className="text-500">
            Gravada criptografada no banco. Use o olho para conferir o valor.
          </small>
        </div>

        <div className="field col-12">
          <LabelPlus
            text="URL de webhook"
            textHelp="Precisa ser alcançável de onde o provider roda. Uma Evolution em container não enxerga o localhost deste servidor — nesse caso use o IP do gateway Docker (172.17.0.1)."
          />
          <Controller
            control={control}
            name="webhook_url"
            render={({ field }) => (
              <InputText
                {...field}
                placeholder="https://api.exemplo.com.br/api/whatsapp/webhook"
              />
            )}
          />
        </div>

        <div className="field col-12 md:col-6 flex align-items-center gap-2">
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <InputSwitch
                checked={field.value}
                onChange={(e) => field.onChange(e.value)}
              />
            )}
          />
          <span className="text-sm">Integração ativa</span>
        </div>

        <div className="field col-12 md:col-6 flex align-items-center gap-2">
          <Controller
            control={control}
            name="is_default"
            render={({ field }) => (
              <InputSwitch
                checked={field.value}
                onChange={(e) => field.onChange(e.value)}
              />
            )}
          />
          <span className="text-sm">
            Padrão
            <small className="block text-500">Usada por canais sem integração própria</small>
          </span>
        </div>

        {resultado && (
          <div className="col-12">
            <Message
              severity={resultado.ok ? 'success' : 'error'}
              text={resultado.mensagem}
              className="w-full justify-content-start"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

export default ModalFormIntegracao;
