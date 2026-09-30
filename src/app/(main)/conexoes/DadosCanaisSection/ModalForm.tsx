import { memo, useEffect, useMemo, useState } from 'react';
import { Dialog as Modal } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { MultiSelect } from 'primereact/multiselect';
import { TabPanel, TabView } from 'primereact/tabview';
import { Button } from 'primereact/button';
import { useForm, Controller } from 'react-hook-form';

import EditorMensagem from '@/components/EditorMensagem';
import LabelPlus from '@/components/LabelPlus';
import { ChannelResponse, DepartmentResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { Alerta, getFormErrorMessage, msgRequired } from '@/service/Util';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';

/** Teto do campo "Resolver em" - trava só de UI, sem config própria. */
const LIMITE_MINUTOS_RESOLVER = 90;
const STEP_MINUTOS_RESOLVER = 5;

/** "Avisar em" tem teto próprio, menor que o de "Resolver em". */
const LIMITE_MINUTOS_AVISAR = 20;
const STEP_MINUTOS_AVISAR = 2;

/** Estado do anexo de uma mensagem automática: novo, removido ou inalterado. */
export type EstadoAnexo = { arquivoNovo: File | null; removeuAnexo: boolean };

interface IProps<T> {
  visible: boolean;
  value?: T;
  onHide: () => void;
  /** Além do formulário, os anexos de saudação e despedida escolhidos na tela. */
  onComplete: (data: T, saudacao: EstadoAnexo, despedida: EstadoAnexo) => void;
}

/** 16 MB: o teto do WhatsApp para documento, que é o mais restritivo. */
const LIMITE_MB_ANEXO = 16;

const defaultValues = {
  id: null,
  name: '',
  mensagem_saudacao: '',
  mensagem_despedida: '',
  inatividade_ativa: false,
  // Preenchidos de verdade desde o início (não só um fallback visual do
  // Slider) - sem isto, salvar com o switch ligado sem arrastar nenhum dos
  // dois sliders mandava `null` ao backend, que recusava com "informe os
  // minutos", mesmo a tela já mostrando "5 min"/"2 min" nos labels.
  inatividade_resolver_em_minutos: STEP_MINUTOS_RESOLVER,
  inatividade_avisar_em_minutos: STEP_MINUTOS_AVISAR,
  inatividade_mensagem_aviso: '',
  inatividade_enviar_despedida: false,
  department_ids: [],
};

const ModalForm = (props: IProps<ChannelResponse>) => {
  const { visible, onHide, value, onComplete } = props;

  const { podeAdicionar, podeEditar, semPermissao } = usePermissoesModulo('channel');

  // Editar exige `:update`; criar, `:add`. Sem a permissão do caso, o
  // formulário abre em somente leitura - quem tem `:view` consulta o cadastro.
  const somenteLeitura = value?.id ? !podeEditar : !podeAdicionar;

  const { control, handleSubmit, reset, watch, setValue } = useForm<ChannelResponse>({
    reValidateMode: 'onBlur',
  });
  const { FetchReq } = useApi();
  const [setores, setSetores] = useState<DepartmentResponse[]>([]);
  const [abaAtiva, setAbaAtiva] = useState(0);

  const inatividadeAtiva = watch('inatividade_ativa');
  const inatividadeResolverEm = watch('inatividade_resolver_em_minutos');
  const inatividadeAvisarEm = watch('inatividade_avisar_em_minutos');

  const anexoVazio: EstadoAnexo = { arquivoNovo: null, removeuAnexo: false };
  const [anexoSaudacao, setAnexoSaudacao] = useState<EstadoAnexo>(anexoVazio);
  const [anexoDespedida, setAnexoDespedida] = useState<EstadoAnexo>(anexoVazio);
  const [erroAnexoSaudacao, setErroAnexoSaudacao] = useState<string | null>(null);
  const [erroAnexoDespedida, setErroAnexoDespedida] = useState<string | null>(null);

  const escolherArquivo = (
    arquivo: File,
    setAnexo: typeof setAnexoSaudacao,
    setErro: typeof setErroAnexoSaudacao,
  ) => {
    if (arquivo.size > LIMITE_MB_ANEXO * 1024 * 1024) {
      setErro(`O arquivo deve ter no máximo ${LIMITE_MB_ANEXO} MB`);
      return;
    }

    setErro(null);
    setAnexo({ arquivoNovo: arquivo, removeuAnexo: false });
  };

  // O nome que aparece na barra: o recém-escolhido vence o gravado, e
  // "removido" esvazia os dois.
  const nomeAnexo = (estado: EstadoAnexo, nomeGravado: string | null | undefined) =>
    estado.removeuAnexo ? null : (estado.arquivoNovo?.name ?? nomeGravado ?? null);

  // O `blob:` só existe enquanto o arquivo está selecionado - criado e
  // revogado aqui, um por campo, para não vazar entre trocas de arquivo ou ao
  // fechar o modal.
  const blobSaudacao = useMemo(
    () => (anexoSaudacao.arquivoNovo ? URL.createObjectURL(anexoSaudacao.arquivoNovo) : null),
    [anexoSaudacao.arquivoNovo],
  );
  useEffect(() => () => { if (blobSaudacao) URL.revokeObjectURL(blobSaudacao); }, [blobSaudacao]);

  const blobDespedida = useMemo(
    () => (anexoDespedida.arquivoNovo ? URL.createObjectURL(anexoDespedida.arquivoNovo) : null),
    [anexoDespedida.arquivoNovo],
  );
  useEffect(() => () => { if (blobDespedida) URL.revokeObjectURL(blobDespedida); }, [blobDespedida]);

  // Para onde o clique no nome leva: o `blob:` local do arquivo recém-
  // escolhido vence a URL pública do que já está gravado; "removido" esvazia
  // os dois.
  const urlAnexo = (estado: EstadoAnexo, blobNovo: string | null, urlGravada: string | null | undefined) =>
    estado.removeuAnexo ? null : (blobNovo ?? urlGravada ?? null);

  const onSubmit = async (data: ChannelResponse) => {
    // Mesma regra do backend (`ChannelsService.validaInatividade`), checada
    // aqui antes para o atendente não descobrir só na resposta de erro da API.
    if (
      data.inatividade_ativa &&
      data.inatividade_avisar_em_minutos != null &&
      data.inatividade_resolver_em_minutos != null &&
      data.inatividade_avisar_em_minutos >= data.inatividade_resolver_em_minutos
    ) {
      setAbaAtiva(1);
      Alerta('O tempo para avisar deve ser menor que o tempo para resolver', 'Atenção', 'warning');
      return;
    }

    // Com a resolução automática ligada, o cliente precisa ser avisado antes
    // de o atendimento encerrar sozinho - sem texto, ele é surpreendido pelo
    // encerramento sem nenhum aviso prévio.
    if (data.inatividade_ativa && !data.inatividade_mensagem_aviso?.trim()) {
      setAbaAtiva(1);
      Alerta('Informe a mensagem de aviso para ativar a resolução automática', 'Atenção', 'warning');
      return;
    }

    onComplete && onComplete(data, anexoSaudacao, anexoDespedida);
  };

  useEffect(() => {
    reset({
      ...defaultValues,
      ...value,
      // Canal existente, criado antes desta feature, tem os dois `null` no
      // banco - sem isto, o spread de `value` sobrescreveria o padrão de
      // `defaultValues` de volta para `null`.
      inatividade_resolver_em_minutos:
        value?.inatividade_resolver_em_minutos ?? STEP_MINUTOS_RESOLVER,
      inatividade_avisar_em_minutos: value?.inatividade_avisar_em_minutos ?? STEP_MINUTOS_AVISAR,
      // `value.departments` só vem populado quando o canal foi recarregado
      // individualmente (`GET /channels/:id`, `findChannelComSetores`) - a
      // listagem não traz essa relação.
      department_ids: value?.departments?.map((setor) => setor.id) ?? [],
    });
    setAnexoSaudacao(anexoVazio);
    setAnexoDespedida(anexoVazio);
    setErroAnexoSaudacao(null);
    setErroAnexoDespedida(null);
    setAbaAtiva(0);
  }, [visible, value]);

  // Carregados ao abrir: a lista muda pouco, mas cadastrar um setor novo e
  // voltar aqui sem vê-lo na seleção seria confuso.
  //
  // Sem `department:view` a chamada falha, e o campo de setores é só um
  // extra opcional deste formulário - configurar a conexão não pode ficar
  // bloqueado por um alerta de erro por causa disso. O campo some (mesmo
  // padrão de `ModalFormUser`), silenciosamente.
  useEffect(() => {
    if (!visible) return;

    const carregar = async () => {
      try {
        const dadosSetores = await FetchReq<DepartmentResponse[]>('ListarSetores');
        setSetores(dadosSetores ?? []);
      } catch {
        setSetores([]);
      }
    };

    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <>
      <Modal
        resizable={false}
        header={`${value?.id ? 'Editar conexão' : 'Nova conexão'} `}
        visible={visible}
        className="w-11 md:w-9 lg:w-8"
        style={{ minWidth: '22rem' }}
        onHide={onHide}
        blockScroll
        closeOnEscape={false}
      >
        <TabView
          activeIndex={abaAtiva}
          onTabChange={(e) => setAbaAtiva(e.index)}
        >
        <TabPanel
          header="Geral"
          leftIcon="fa-regular fa-sliders mr-2"
        >
        <div className="formgrid grid gap-3">
          <div className="col-12 p-fluid">
            <LabelPlus
              text="Nome da conexão"
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
                      textHelp="Os setores atendidos por esta conexão - pode ser mais de um. Sem chatbot ativo, se todos estiverem fora do horário de atendimento, a conexão manda a mensagem de ausência do primeiro setor vinculado em vez da saudação."
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
                  comAnexo
                  nomeAnexo={nomeAnexo(anexoSaudacao, value?.saudacao_anexo_nome)}
                  urlAnexo={urlAnexo(anexoSaudacao, blobSaudacao, value?.saudacao_anexo_url)}
                  onEscolherAnexo={(arquivo) =>
                    escolherArquivo(arquivo, setAnexoSaudacao, setErroAnexoSaudacao)
                  }
                  onRemoverAnexo={() => setAnexoSaudacao({ arquivoNovo: null, removeuAnexo: true })}
                />
              )}
            />
            {erroAnexoSaudacao && <small className="block mt-1 p-error">{erroAnexoSaudacao}</small>}
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
                  comAnexo
                  nomeAnexo={nomeAnexo(anexoDespedida, value?.despedida_anexo_nome)}
                  urlAnexo={urlAnexo(anexoDespedida, blobDespedida, value?.despedida_anexo_url)}
                  onEscolherAnexo={(arquivo) =>
                    escolherArquivo(arquivo, setAnexoDespedida, setErroAnexoDespedida)
                  }
                  onRemoverAnexo={() => setAnexoDespedida({ arquivoNovo: null, removeuAnexo: true })}
                />
              )}
            />
            {erroAnexoDespedida && <small className="block mt-1 p-error">{erroAnexoDespedida}</small>}
          </div>
        </div>
        </TabPanel>

        <TabPanel
          header="Resolução"
          leftIcon="fa-regular fa-clock mr-2"
        >
          {/* Sem `gap-3`: essa classe soma `gap` de verdade ao flex, e o
              `.grid` do PrimeFlex já simula o mesmo espaçamento via margem
              negativa + padding nos filhos - com os dois juntos, a largura
              somada dos dois `col-6` passava da do container por causa do
              gap extra, e eles quebravam de linha (só não aparecia na aba
              "Geral" porque lá tudo é `col-12`, nunca dois lado a lado). */}
          <div className="formgrid grid">
            <div className="col-12">
              <Controller
                control={control}
                name="inatividade_ativa"
                render={({ field }) => (
                  <div className="flex align-items-center gap-3">
                    <InputSwitch
                      inputId={field.name}
                      checked={Boolean(field.value)}
                      onChange={(e) => field.onChange(Boolean(e.value))}
                      disabled={somenteLeitura}
                    />
                    <label
                      htmlFor={field.name}
                      className="text-900 font-medium"
                    >
                      Ativar resolução automática
                    </label>
                  </div>
                )}
              />
              <small className="text-500 block mt-1">
                Atendimento parado (sem mensagem de nenhum dos dois lados) é avisado e, sem
                resposta, finalizado sozinho.
              </small>
            </div>

            <div className="col-6 pr-3 mt-3 p-fluid">
              <LabelPlus
                text="Resolver em"
                textHelp="Minutos sem mensagem de nenhum dos dois lados até o atendimento ser finalizado sozinho."
              />
              <Controller
                control={control}
                name="inatividade_resolver_em_minutos"
                render={({ field }) => (
                  <InputNumber
                    inputId={field.name}
                    value={field.value ?? STEP_MINUTOS_RESOLVER}
                    onValueChange={(e) => {
                      const novoValor = e.value ?? STEP_MINUTOS_RESOLVER;
                      field.onChange(novoValor);
                      // "Avisar em" nunca pode passar de "Resolver em" -
                      // baixar o primeiro abaixo do segundo empurra o
                      // segundo junto, em vez de deixar um estado inválido
                      // só sinalizado por mensagem de erro.
                      if (inatividadeAvisarEm != null && inatividadeAvisarEm >= novoValor) {
                        setValue(
                          'inatividade_avisar_em_minutos',
                          Math.max(STEP_MINUTOS_AVISAR, novoValor - STEP_MINUTOS_RESOLVER),
                        );
                      }
                    }}
                    className="p-inputtext-sm"
                    min={STEP_MINUTOS_RESOLVER}
                    max={LIMITE_MINUTOS_RESOLVER}
                    step={STEP_MINUTOS_RESOLVER}
                    suffix=" min"
                    showButtons
                    disabled={somenteLeitura || !inatividadeAtiva}
                  />
                )}
              />
            </div>

            <div className="col-6 pl-3 mt-3 p-fluid">
              <LabelPlus
                text="Avisar em"
                textHelp="Quantos minutos antes de resolver o aviso é enviado ao cliente. Não pode passar do tempo para resolver."
              />
              <Controller
                control={control}
                name="inatividade_avisar_em_minutos"
                render={({ field }) => (
                  <InputNumber
                    inputId={field.name}
                    value={field.value ?? STEP_MINUTOS_AVISAR}
                    onValueChange={(e) => field.onChange(e.value ?? STEP_MINUTOS_AVISAR)}
                    min={STEP_MINUTOS_AVISAR}
                    // Nunca passa do "Resolver em": o teto do próprio ajuste
                    // (20 min) já é menor na maioria dos casos, mas com
                    // "Resolver em" configurado abaixo de 20 o campo não
                    // aceita ir além dele.
                    max={Math.min(
                      LIMITE_MINUTOS_AVISAR,
                      inatividadeResolverEm ?? LIMITE_MINUTOS_AVISAR,
                    )}
                    step={STEP_MINUTOS_AVISAR}
                    suffix=" min"
                    showButtons
                    disabled={somenteLeitura || !inatividadeAtiva}
                    className="p-inputtext-sm"
                  />
                )}
              />
            </div>

            <div className="col-12 mt-5">
              <LabelPlus
                text="Mensagem de aviso"
                textHelp="Enviada ao cliente ao se aproximar da resolução por inatividade. Obrigatória com a resolução automática ativa."
                required={inatividadeAtiva}
              />
              <Controller
                control={control}
                name="inatividade_mensagem_aviso"
                render={({ field }) => (
                  <EditorMensagem
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder="Ex.: {{nome}}, percebemos que você está ausente. Sem resposta, este atendimento será encerrado em breve."
                    comPreVisualizacao
                    rows={3}
                    disabled={somenteLeitura || !inatividadeAtiva}
                  />
                )}
              />
            </div>

            <div className="col-12 mt-3">
              <Controller
                control={control}
                name="inatividade_enviar_despedida"
                render={({ field }) => (
                  <div className="flex align-items-center gap-3">
                    <InputSwitch
                      inputId={field.name}
                      checked={Boolean(field.value)}
                      onChange={(e) => field.onChange(Boolean(e.value))}
                      disabled={somenteLeitura || !inatividadeAtiva}
                    />
                    <label
                      htmlFor={field.name}
                      className="text-900 font-medium"
                    >
                      Enviar mensagem de despedida ao finalizar por inatividade
                    </label>
                  </div>
                )}
              />
              <small className="text-500 block mt-1">
                Além do encerramento, envia também a mensagem de despedida configurada na aba
                "Geral". Desligado, a conversa só é encerrada, sem mensagem adicional.
              </small>
            </div>
          </div>
        </TabPanel>
        </TabView>

        <div className="flex justify-content-end pt-3">
          <Button
            label="Salvar"
            disabled={somenteLeitura}
            title={somenteLeitura ? semPermissao : undefined}
            onClick={() => handleSubmit(onSubmit)()}
          />
        </div>
      </Modal>
    </>
  );
};

export default memo(ModalForm);
