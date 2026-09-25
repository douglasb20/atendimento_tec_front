import { memo, useEffect, useState } from 'react';
import { Dialog as Modal } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { MultiSelect } from 'primereact/multiselect';
import { Button } from 'primereact/button';
import { useForm, Controller } from 'react-hook-form';

import EditorMensagem from '@/components/EditorMensagem';
import LabelPlus from '@/components/LabelPlus';
import { ChannelResponse, DepartmentResponse, IntegrationResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta, getFormErrorMessage, msgRequired } from '@/service/Util';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';

interface IProps<T> {
  visible: boolean;
  value?: T;
  onHide: () => void;
  onComplete: (data: T) => void;
}

const defaultValues = {
  id: null,
  name: '',
  integration_id: null,
  mensagem_saudacao: '',
  mensagem_despedida: '',
  department_ids: [],
};

/** Opção que representa "sem vínculo" - o canal cai na integração padrão. */
const USAR_PADRAO = { id: null as number | null, name: 'Usar a integração padrão' };

const ModalForm = (props: IProps<ChannelResponse>) => {
  const { visible, onHide, value, onComplete } = props;

  const { podeAdicionar, podeEditar, semPermissao } = usePermissoesModulo('channel');

  // Editar exige `:update`; criar, `:add`. Sem a permissão do caso, o
  // formulário abre em somente leitura - quem tem `:view` consulta o cadastro.
  const somenteLeitura = value?.id ? !podeEditar : !podeAdicionar;

  const { control, handleSubmit, reset } = useForm<ChannelResponse>({
    reValidateMode: 'onBlur',
  });
  const { FetchReq } = useApi();
  const [integracoes, setIntegracoes] = useState<IntegrationResponse[]>([]);
  const [setores, setSetores] = useState<DepartmentResponse[]>([]);

  const onSubmit = async (data: ChannelResponse) => {
    onComplete && onComplete(data);
  };

  useEffect(() => {
    reset({
      ...defaultValues,
      ...value,
      // `value.departments` só vem populado quando o canal foi recarregado
      // individualmente (`GET /channels/:id`, `findChannelComSetores`) - a
      // listagem não traz essa relação.
      department_ids: value?.departments?.map((setor) => setor.id) ?? [],
    });
  }, [visible, value]);

  // Carregadas ao abrir: a lista muda pouco, mas cadastrar uma integração nova
  // e voltar aqui sem vê-la na seleção seria confuso.
  useEffect(() => {
    if (!visible) return;

    const carregar = async () => {
      try {
        const [dadosIntegracoes, dadosSetores] = await Promise.all([
          FetchReq<IntegrationResponse[]>('ListarIntegracoes'),
          FetchReq<DepartmentResponse[]>('ListarSetores'),
        ]);
        setIntegracoes((dadosIntegracoes ?? []).filter((i) => i.is_active));
        setSetores(dadosSetores ?? []);
      } catch (err) {
        CatchAlerta(err, 'Não foi possível carregar as integrações/setores');
      }
    };

    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <>
      <Modal
        resizable={false}
        header={`${value?.id ? 'Editar canal' : 'Novo canal'} `}
        visible={visible}
        className="w-11 md:w-9 lg:w-8"
        style={{ minWidth: '22rem' }}
        onHide={onHide}
        blockScroll
        closeOnEscape={false}
      >
        <div className="formgrid grid gap-3">
          <div className="col-12 p-fluid">
            <LabelPlus
              text="Nome do canal"
              required
            />
            <Controller
              control={control}
              name="name"
              rules={{
                required: msgRequired,
              }}
              render={({ field, fieldState }) => (
                <>
                  <InputText
                    {...field}
                    placeholder="Ex.: Suporte"
                    disabled={somenteLeitura}
                  />
                  {getFormErrorMessage(fieldState)}
                </>
              )}
            />
          </div>

          <div className="col-12 p-fluid">
            <LabelPlus
              text="Integração"
              textHelp="Qual servidor de provider atende este canal. Deixando na padrão, o canal segue a integração marcada como tal - o que basta quando há um servidor só."
            />
            <Controller
              control={control}
              name="integration_id"
              render={({ field }) => (
                <Dropdown
                  {...field}
                  // `USAR_PADRAO` na frente: o valor nulo é uma escolha
                  // legítima, não ausência de escolha, e precisa ser
                  // selecionável de volta depois de trocado.
                  options={[USAR_PADRAO, ...integracoes]}
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Usar a integração padrão"
                  disabled={somenteLeitura}
                />
              )}
            />
          </div>

          {setores.length > 0 && (
            <div className="col-12 p-fluid">
              <Controller
                control={control}
                name="department_ids"
                render={({ field }) => (
                  <>
                    <LabelPlus
                      htmlFor={field.name}
                      text="Setores"
                      textHelp="Os setores atendidos por este canal - pode ser mais de um. Sem chatbot ativo, se todos estiverem fora do horário de atendimento, o canal manda a mensagem de ausência do primeiro setor vinculado em vez da saudação."
                    />
                    <MultiSelect
                      id={field.name}
                      value={field.value ?? []}
                      onChange={(e) => field.onChange(e.value)}
                      options={setores}
                      optionLabel="name"
                      optionValue="id"
                      display="chip"
                      placeholder="Nenhum setor"
                      disabled={somenteLeitura}
                    />
                  </>
                )}
              />
            </div>
          )}

          <div className="col-12">
            <LabelPlus
              text="Mensagem de saudação"
              textHelp="Enviada sozinha quando um contato abre uma conversa nova. Deixe em branco para não enviar nada."
            />
            <Controller
              control={control}
              name="mensagem_saudacao"
              render={({ field }) => (
                <EditorMensagem
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="Ex.: {{saudacao}}, {{nome}}! Em que podemos ajudar?"
                  comPreVisualizacao
                  rows={3}
                  disabled={somenteLeitura}
                />
              )}
            />
          </div>

          <div className="col-12">
            <LabelPlus
              text="Mensagem de despedida"
              textHelp="Enviada ao finalizar o atendimento. Deixe em branco para não enviar nada."
            />
            <Controller
              control={control}
              name="mensagem_despedida"
              render={({ field }) => (
                <EditorMensagem
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="Ex.: Obrigado pelo contato, {{nome}}! Protocolo {{protocolo}}."
                  comPreVisualizacao
                  rows={3}
                  disabled={somenteLeitura}
                />
              )}
            />
          </div>

          <div className="col-12 flex justify-content-end ">
            <Button
              label="Salvar"
              disabled={somenteLeitura}
              title={somenteLeitura ? semPermissao : undefined}
              onClick={() => handleSubmit(onSubmit)()}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default memo(ModalForm);
