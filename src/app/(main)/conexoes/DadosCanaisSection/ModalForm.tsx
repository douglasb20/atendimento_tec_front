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

import AbaConexao from './AbaConexao';

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
  /** Ações da aba "Conexão" - a sessão do WhatsApp vive fora do formulário. */
  onStartSession: (numero?: string) => void | Promise<void>;
  onDisconnectSession: () => void;
  onSincronizarStatus: () => void;
  sincronizando?: boolean;
  /** Abre o modal já na aba "Conexão" (vem do badge de status do topbar). */
  abrirNaConexao?: boolean;
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
  inatividade_usar_mensagem_propria: false,
  inatividade_mensagem_finalizacao: '',
  rejeitar_chamadas: false,
  rejeitar_chamadas_enviar_mensagem: false,
  rejeitar_chamadas_mensagem: '',
  department_ids: [],
};

const ModalForm = (props: IProps<ChannelResponse>) => {
  const {
    visible,
    onHide,
    value,
    onComplete,
    onStartSession,
    onDisconnectSession,
    onSincronizarStatus,
    sincronizando,
    abrirNaConexao,
  } = props;

  const { podeAdicionar, podeEditar, podeAcao, semPermissao } = usePermissoesModulo('channel');

  // Editar exige `:update`; criar, `:add`. Sem a permissão do caso, o
  // formulário abre em somente leitura - quem tem `:view` consulta o cadastro.
  const somenteLeitura = value?.id ? !podeEditar : !podeAdicionar;

  // A aba "Conexão" só existe em canal já salvo (canal novo não tem sessão) e
  // com `channel:config` - derrubar a conexão é mais grave do que corrigir o
  // nome, e por isso nunca andou junto de `:update`.
  const mostraAbaConexao = Boolean(value?.id) && podeAcao('config');

  // Os índices das abas dependem de a de conexão existir ou não; nomeá-los
  // evita que a validação do `onSubmit` mande o atendente para a aba errada.
  const ABA_GERAL = 0;
  const ABA_CONEXAO = mostraAbaConexao ? 1 : -1;
  const ABA_RESOLUCAO = mostraAbaConexao ? 2 : 1;

  const { control, handleSubmit, reset, watch, setValue } = useForm<ChannelResponse>({
    reValidateMode: 'onBlur',
  });
  const { FetchReq } = useApi();
  const [setores, setSetores] = useState<DepartmentResponse[]>([]);
  const [abaAtiva, setAbaAtiva] = useState(0);

  const inatividadeAtiva = watch('inatividade_ativa');
  const inatividadeResolverEm = watch('inatividade_resolver_em_minutos');
  const inatividadeAvisarEm = watch('inatividade_avisar_em_minutos');
  const inatividadeEnviarDespedida = watch('inatividade_enviar_despedida');
  const inatividadeUsarMensagemPropria = watch('inatividade_usar_mensagem_propria');
  const rejeitarChamadas = watch('rejeitar_chamadas');
  const rejeitarChamadasEnviarMensagem = watch('rejeitar_chamadas_enviar_mensagem');

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
  useEffect(
    () => () => {
      if (blobSaudacao) URL.revokeObjectURL(blobSaudacao);
    },
    [blobSaudacao],
  );

  const blobDespedida = useMemo(
    () => (anexoDespedida.arquivoNovo ? URL.createObjectURL(anexoDespedida.arquivoNovo) : null),
    [anexoDespedida.arquivoNovo],
  );
  useEffect(
    () => () => {
      if (blobDespedida) URL.revokeObjectURL(blobDespedida);
    },
    [blobDespedida],
  );

  // Para onde o clique no nome leva: o `blob:` local do arquivo recém-
  // escolhido vence a URL pública do que já está gravado; "removido" esvazia
  // os dois.
  const urlAnexo = (
    estado: EstadoAnexo,
    blobNovo: string | null,
    urlGravada: string | null | undefined,
  ) => (estado.removeuAnexo ? null : (blobNovo ?? urlGravada ?? null));

  const onSubmit = async (data: ChannelResponse) => {
    // Mesma regra do backend (`ChannelsService.validaInatividade`), checada
    // aqui antes para o atendente não descobrir só na resposta de erro da API.
    if (
      data.inatividade_ativa &&
      data.inatividade_avisar_em_minutos != null &&
      data.inatividade_resolver_em_minutos != null &&
      data.inatividade_avisar_em_minutos >= data.inatividade_resolver_em_minutos
    ) {
      setAbaAtiva(ABA_RESOLUCAO);
      Alerta('O tempo para avisar deve ser menor que o tempo para resolver', 'Atenção', 'warning');
      return;
    }

    // Com a resolução automática ligada, o cliente precisa ser avisado antes
    // de o atendimento encerrar sozinho - sem texto, ele é surpreendido pelo
    // encerramento sem nenhum aviso prévio.
    if (data.inatividade_ativa && !data.inatividade_mensagem_aviso?.trim()) {
      setAbaAtiva(ABA_RESOLUCAO);
      Alerta(
        'Informe a mensagem de aviso para ativar a resolução automática',
        'Atenção',
        'warning',
      );
      return;
    }

    // Escolher a mensagem própria e deixá-la em branco não enviaria nada - o
    // que não é nenhuma das duas opções oferecidas pelo switch.
    if (
      data.inatividade_ativa &&
      data.inatividade_enviar_despedida &&
      data.inatividade_usar_mensagem_propria &&
      !data.inatividade_mensagem_finalizacao?.trim()
    ) {
      setAbaAtiva(ABA_RESOLUCAO);
      Alerta('Informe a mensagem de finalização por inatividade', 'Atenção', 'warning');
      return;
    }

    // A outra ponta da mesma escolha: optou pela despedida padrão, mas não há
    // despedida cadastrada na aba "Geral" - o encerramento sairia mudo.
    if (
      data.inatividade_ativa &&
      data.inatividade_enviar_despedida &&
      !data.inatividade_usar_mensagem_propria &&
      !data.mensagem_despedida?.trim()
    ) {
      setAbaAtiva(ABA_GERAL);
      Alerta(
        'Cadastre a mensagem de despedida ou escolha uma mensagem própria para a inatividade',
        'Atenção',
        'warning',
      );
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
    setAbaAtiva(abrirNaConexao && mostraAbaConexao ? ABA_CONEXAO : ABA_GERAL);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        className="w-11 md:w-9 lg:w-8 mt-6"
        style={{ minWidth: '22rem' }}
        onHide={onHide}
        blockScroll
        closeOnEscape={false}
        position="top"
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
              <div className="col-12 grid m-0 p-0">
                <div className="col-6 p-fluid">
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
                  <div className="col-6 p-fluid">
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
              </div>

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
                      onRemoverAnexo={() =>
                        setAnexoSaudacao({ arquivoNovo: null, removeuAnexo: true })
                      }
                    />
                  )}
                />
                {erroAnexoSaudacao && (
                  <small className="block mt-1 p-error">{erroAnexoSaudacao}</small>
                )}
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
                      onRemoverAnexo={() =>
                        setAnexoDespedida({ arquivoNovo: null, removeuAnexo: true })
                      }
                    />
                  )}
                />
                {erroAnexoDespedida && (
                  <small className="block mt-1 p-error">{erroAnexoDespedida}</small>
                )}
              </div>
            </div>
          </TabPanel>

          {/* Condicional em vez de `visible={false}`: o TabView do PrimeReact
            conta os painéis pela ordem dos filhos, e um painel oculto ainda
            ocuparia um índice - a validação mandaria para a aba errada. */}
          {mostraAbaConexao && (
            <TabPanel
              header="Conexão"
              leftIcon="fa-regular fa-plug mr-2"
            >
              <AbaConexao
                ativa={visible && abaAtiva === ABA_CONEXAO}
                value={value}
                onStartSession={onStartSession}
                onDisconnectSession={onDisconnectSession}
                onSincronizarStatus={onSincronizarStatus}
                sincronizando={sincronizando}
              />
            </TabPanel>
          )}

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
                      <LabelPlus
                        htmlFor={field.name}
                        className="text-900 font-medium"
                        text="Ativar resolução automática"
                        textHelp="Atendimento parado (sem mensagem de nenhum dos dois lados) é avisado e, sem resposta, finalizado sozinho."
                      />
                    </div>
                  )}
                />
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

              {/* Os dois lado a lado: o segundo só qualifica o primeiro
                  (se avisa, com qual texto), e empilhados davam a impressão
                  de serem duas opções independentes. */}
              <div className="col-12 md:col-6 mt-3">
                <Controller
                  control={control}
                  name="inatividade_enviar_despedida"
                  render={({ field }) => (
                    <div className="flex align-items-center gap-3">
                      <InputSwitch
                        inputId={field.name}
                        checked={Boolean(field.value)}
                        onChange={(e) => {
                          const ligado = Boolean(e.value);
                          field.onChange(ligado);
                          // Não avisar o cliente torna a escolha do texto sem
                          // sentido - deixá-la gravada guardaria uma decisão
                          // que não se aplica a nada (mesmo tratamento de
                          // `rejeitar_chamadas` na aba "Preferências").
                          if (!ligado) setValue('inatividade_usar_mensagem_propria', false);
                        }}
                        disabled={somenteLeitura || !inatividadeAtiva}
                      />
                      <LabelPlus
                        htmlFor={field.name}
                        className="text-900 font-medium"
                        text="Avisar o cliente ao finalizar por inatividade"
                        textHelp="Envia uma mensagem no momento do encerramento. Desligado, a conversa só é encerrada, sem mensagem adicional."
                      />
                    </div>
                  )}
                />
              </div>

              {/* Qual texto sai é decisão explícita, não deduzida de o campo
                estar vazio: quem reconfigurar o canal meses depois apagaria o
                texto achando que desligava a mensagem e, sem perceber,
                ligaria a despedida padrão no lugar. */}
              <div className="col-12 md:col-6 mt-3">
                <Controller
                  control={control}
                  name="inatividade_usar_mensagem_propria"
                  render={({ field }) => (
                    <div className="flex align-items-center gap-3">
                      <InputSwitch
                        inputId={field.name}
                        checked={Boolean(field.value)}
                        onChange={(e) => field.onChange(Boolean(e.value))}
                        disabled={
                          somenteLeitura || !inatividadeAtiva || !inatividadeEnviarDespedida
                        }
                      />
                      <LabelPlus
                        htmlFor={field.name}
                        className="text-900 font-medium"
                        text="Usar uma mensagem própria para a inatividade"
                        textHelp='Desligado, envia a mensagem de despedida da aba "Geral", com o anexo dela - que costuma soar fora de contexto aqui, por pressupor um atendimento concluído. Ligado, envia o texto abaixo, sem anexo.'
                      />
                    </div>
                  )}
                />
              </div>

              <div className="col-12 mt-4">
                <LabelPlus
                  text="Mensagem de finalização"
                  textHelp="Enviada no momento em que o atendimento é encerrado por inatividade."
                  required={inatividadeUsarMensagemPropria}
                />
                <Controller
                  control={control}
                  name="inatividade_mensagem_finalizacao"
                  render={({ field }) => (
                    <EditorMensagem
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder="Ex.: {{nome}}, encerramos este atendimento por inatividade. Protocolo {{protocolo}}. É só mandar uma mensagem que atendemos você de novo."
                      comPreVisualizacao
                      rows={3}
                      disabled={
                        somenteLeitura ||
                        !inatividadeAtiva ||
                        !inatividadeEnviarDespedida ||
                        !inatividadeUsarMensagemPropria
                      }
                    />
                  )}
                />
              </div>
            </div>
          </TabPanel>

          <TabPanel
            header="Preferências"
            leftIcon="fa-regular fa-sliders mr-2"
          >
            <div className="formgrid grid">
              {/* Lado a lado pelo mesmo motivo da aba "Resolução": o segundo
                  switch só qualifica o primeiro (se rejeita, avisando ou
                  não), e não é uma opção independente dele. */}
              <div className="col-12 md:col-6">
                <Controller
                  control={control}
                  name="rejeitar_chamadas"
                  render={({ field }) => (
                    <div className="flex align-items-center gap-3">
                      <InputSwitch
                        inputId={field.name}
                        checked={Boolean(field.value)}
                        onChange={(e) => {
                          const ligado = Boolean(e.value);
                          field.onChange(ligado);
                          // Desligar a rejeição desliga o envio junto: mensagem
                          // de rejeição sem rejeição não significa nada, e o
                          // campo ficaria preenchido mas inerte.
                          if (!ligado) setValue('rejeitar_chamadas_enviar_mensagem', false);
                        }}
                        disabled={somenteLeitura}
                      />
                      <LabelPlus
                        htmlFor={field.name}
                        className="text-900 font-medium"
                        text="Rejeitar chamadas automaticamente"
                        textHelp="Toda chamada recebida neste número é recusada na hora, sem tocar. Desligado, a chamada toca normalmente no aparelho e a conversa apenas registra que ela houve."
                      />
                    </div>
                  )}
                />
              </div>

              <div className="col-12 md:col-6">
                <Controller
                  control={control}
                  name="rejeitar_chamadas_enviar_mensagem"
                  render={({ field }) => (
                    <div className="flex align-items-center gap-3">
                      <InputSwitch
                        inputId={field.name}
                        checked={Boolean(field.value)}
                        onChange={(e) => field.onChange(Boolean(e.value))}
                        disabled={somenteLeitura || !rejeitarChamadas}
                      />
                      <LabelPlus
                        htmlFor={field.name}
                        className="text-900 font-medium"
                        text="Enviar mensagem ao rejeitar"
                        textHelp="A mensagem chega ao cliente, mas NÃO aparece na conversa: o atendente vê apenas o registro de que a chamada foi rejeitada."
                      />
                    </div>
                  )}
                />
              </div>

              <div className="col-12 mt-4">
                <LabelPlus
                  text="Mensagem de rejeição"
                  textHelp="Enviada ao cliente quando a chamada é recusada. Não aparece na conversa."
                  required={rejeitarChamadasEnviarMensagem}
                />
                <Controller
                  control={control}
                  name="rejeitar_chamadas_mensagem"
                  render={({ field }) => (
                    <EditorMensagem
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder="Ex.: Olá {{nome}}! Não atendemos por chamadas. Envie sua dúvida por mensagem que respondemos por aqui."
                      comPreVisualizacao
                      rows={3}
                      disabled={
                        somenteLeitura || !rejeitarChamadas || !rejeitarChamadasEnviarMensagem
                      }
                    />
                  )}
                />
              </div>
            </div>
          </TabPanel>
        </TabView>

        {abaAtiva !== ABA_CONEXAO && (
          <div className="flex justify-content-end pt-3">
            <Button
              label="Salvar"
              disabled={somenteLeitura}
              title={somenteLeitura ? semPermissao : undefined}
              onClick={() => handleSubmit(onSubmit)()}
            />
          </div>
        )}
      </Modal>
    </>
  );
};

export default memo(ModalForm);
