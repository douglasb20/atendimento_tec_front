import { memo, useEffect, useMemo, useState } from 'react';
import { Dialog as Modal } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { MultiSelect } from 'primereact/multiselect';
import { Button } from 'primereact/button';
import { useForm, Controller } from 'react-hook-form';

import EditorMensagem from '@/components/EditorMensagem';
import LabelPlus from '@/components/LabelPlus';
import { ChannelResponse, DepartmentResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta, getFormErrorMessage, msgRequired } from '@/service/Util';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';

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
  department_ids: [],
};

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
  const [setores, setSetores] = useState<DepartmentResponse[]>([]);

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
    onComplete && onComplete(data, anexoSaudacao, anexoDespedida);
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
    setAnexoSaudacao(anexoVazio);
    setAnexoDespedida(anexoVazio);
    setErroAnexoSaudacao(null);
    setErroAnexoDespedida(null);
  }, [visible, value]);

  // Carregados ao abrir: a lista muda pouco, mas cadastrar um setor novo e
  // voltar aqui sem vê-lo na seleção seria confuso.
  useEffect(() => {
    if (!visible) return;

    const carregar = async () => {
      try {
        const dadosSetores = await FetchReq<DepartmentResponse[]>('ListarSetores');
        setSetores(dadosSetores ?? []);
      } catch (err) {
        CatchAlerta(err, 'Não foi possível carregar os setores');
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
