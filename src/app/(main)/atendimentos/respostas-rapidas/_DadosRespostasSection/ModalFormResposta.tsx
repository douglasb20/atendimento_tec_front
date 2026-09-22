'use client';

import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import EditorMensagem from '@/components/EditorMensagem';
import LabelPlus from '@/components/LabelPlus';
import { QuickReplyForm, QuickReplyResponse } from '@/Interfaces';
import { getFormErrorMessage, msgRequired } from '@/service/Util';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';

type ModalFormRespostaProps = {
  visible: boolean;
  onHide: () => void;
  data: QuickReplyResponse | null;
  /** Recebe o formulário e o arquivo novo, quando houver. */
  onConfirm: (fields: QuickReplyForm, arquivoNovo: File | null, removeuAnexo: boolean) => void;
};

const defaultForm: QuickReplyForm = {
  atalho: '',
  mensagem: '',
};

/** 16 MB: o teto do WhatsApp para documento, que é o mais restritivo. */
const LIMITE_MB = 16;

const ModalFormResposta = ({ visible, onHide, data, onConfirm }: ModalFormRespostaProps) => {
  const { podeAdicionar, podeEditar, semPermissao } = usePermissoesModulo('quick.reply');

  // Editar exige `:update`; criar, `:add`. Sem a permissão do caso, o
  // formulário abre em somente leitura - quem tem `:view` consulta o cadastro.
  const somenteLeitura = data?.id ? !podeEditar : !podeAdicionar;

  const { control, handleSubmit, reset } = useForm<QuickReplyForm>({
    defaultValues: defaultForm,
    reValidateMode: 'onBlur',
  });

  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const [arquivoNovo, setArquivoNovo] = useState<File | null>(null);
  const [removeuAnexo, setRemoveuAnexo] = useState(false);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    reset({ ...defaultForm, ...(data ?? {}) });
    setArquivoNovo(null);
    setRemoveuAnexo(false);
    setErroArquivo(null);
  }, [visible, data, reset]);

  // O anexo que aparece na tela: o recém-escolhido vence o que está gravado, e
  // "removido" esvazia os dois.
  const anexoAtual = removeuAnexo ? null : (arquivoNovo?.name ?? data?.anexo_nome ?? null);

  const aoEscolherArquivo = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = evento.target.files?.[0];
    // O input é limpo sempre: sem isto, escolher o mesmo arquivo duas vezes
    // seguidas não dispara o `change` na segunda.
    evento.target.value = '';

    if (!arquivo) return;

    if (arquivo.size > LIMITE_MB * 1024 * 1024) {
      setErroArquivo(`O arquivo deve ter no máximo ${LIMITE_MB} MB`);
      return;
    }

    setErroArquivo(null);
    setArquivoNovo(arquivo);
    setRemoveuAnexo(false);
  };

  const removerAnexo = () => {
    setArquivoNovo(null);
    setRemoveuAnexo(true);
    setErroArquivo(null);
  };

  const rodape = () => (
    <div className="flex justify-content-between">
      <Button
        label="Cancelar"
        severity="danger"
        outlined
        onClick={onHide}
        style={{ width: 'auto' }}
      />
      <Button
        label="Salvar"
        disabled={somenteLeitura}
        title={somenteLeitura ? semPermissao : undefined}
        icon="fa-regular fa-check"
        onClick={() =>
          handleSubmit((fields) => onConfirm(fields, arquivoNovo, removeuAnexo))()
        }
        style={{ width: 'auto' }}
      />
    </div>
  );

  return (
    <Modal
      
      className="p-fluid mt-6"
      style={{ width: '70rem' }}
      breakpoints={{ '960px': '95vw' }}
      visible={visible}
      header={data?.id ? 'Editar resposta rápida' : 'Nova resposta rápida'}
      onHide={onHide}
      footer={rodape}
      position='top'
    >
      <div className="formgrid grid gap-3">
        <div className="col-12">
          <LabelPlus
            text="Atalho"
            required
            textHelp="O que o atendente digita depois da barra. Sem espaços."
          />
          <Controller
            control={control}
            name="atalho"
            rules={{
              required: msgRequired,
              pattern: {
                value: /^[\w.-]+$/,
                message: 'Use apenas letras, números, ponto, hífen e sublinhado',
              },
            }}
            render={({ field, fieldState }) => (
              <>
                {/* A barra fica fora do campo: ela é o gatilho, não parte do
                    nome, e guardá-la obrigaria a tirá-la em toda comparação. */}
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon font-semibold">/</span>
                  <InputText
                    {...field}
                    placeholder="bemvindo"
                    autoFocus
                    disabled={somenteLeitura}
                  />
                </div>
                {getFormErrorMessage(fieldState)}
              </>
            )}
          />
        </div>

        <div className="col-12">
          <LabelPlus
            text="Mensagem"
            required
            textHelp="As variáveis são substituídas quando o atendente insere a resposta na conversa."
          />
          <Controller
            control={control}
            name="mensagem"
            rules={{ required: msgRequired }}
            render={({ field, fieldState }) => (
              <>
                <EditorMensagem
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="Ex.: {{saudacao}}, {{nome}}! Em que podemos ajudar?"
                  maxLength={2000}
                  rows={4}
                  comPreVisualizacao
                  disabled={somenteLeitura}
                />
                {getFormErrorMessage(fieldState)}
              </>
            )}
          />
        </div>

        <div className="col-12">
          <LabelPlus
            text="Anexo"
            textHelp="Opcional. O arquivo é enviado junto com a mensagem."
          />

          <input
            ref={inputArquivoRef}
            type="file"
            className="hidden"
            onChange={aoEscolherArquivo}
          />

          {anexoAtual ? (
            <div className="flex align-items-center gap-2 border-1 surface-border border-round p-2">
              <i className="fa-regular fa-paperclip text-500" />
              <span className="flex-1 text-sm white-space-nowrap overflow-hidden text-overflow-ellipsis">
                {anexoAtual}
              </span>
              {/* Só quando é novo: o gravado já está no storage e trocá-lo
                  passa pelo botão de escolher. */}
              {arquivoNovo && <span className="text-xs text-500">não enviado ainda</span>}
              <Button
                type="button"
                icon="fa-regular fa-xmark"
                text
                rounded
                severity="danger"
                aria-label="Remover anexo"
                onClick={removerAnexo}
                style={{ width: 'auto' }}
              />
            </div>
          ) : (
            <Button
              type="button"
              label="Escolher arquivo"
              icon="fa-regular fa-paperclip"
              outlined
              onClick={() => inputArquivoRef.current?.click()}
              style={{ width: 'auto' }}
            />
          )}

          {erroArquivo && <small className="block mt-1 p-error">{erroArquivo}</small>}
        </div>
      </div>
    </Modal>
  );
};

export default ModalFormResposta;
