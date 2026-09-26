import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from 'primereact/button';
import { Chips } from 'primereact/chips';
import { Dialog as Modal } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { InputText } from 'primereact/inputtext';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';

import LabelPlus from '@/components/LabelPlus';
import {
  AplicaA,
  aplicaAParaLista,
  CustomFieldResponse,
  ROTULO_TIPO,
  TipoCampo,
} from '@/Interfaces';
import { getFormErrorMessage, msgRequired } from '@/service/Util';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';

export type FormCampo = {
  nome: string;
  tipo: TipoCampo;
  /** Marcado na tela como lista; convertido para `aplica_a` ao salvar. */
  aplica_em: Exclude<AplicaA, 'ambos'>[];
  opcoes?: string[];
};

type ModalProps = {
  visible: boolean;
  onHide: () => void;
  onConfirm: (fields: FormCampo) => void;
  data: CustomFieldResponse | null;
};

const defaultForm: FormCampo = {
  nome: '',
  tipo: 'texto',
  // Os dois marcados por padrão: um campo novo costuma servir aos dois lados,
  // e desmarcar é mais fácil que lembrar de marcar.
  aplica_em: ['contato', 'cliente'],
  opcoes: [],
};

const opcoesTipo = Object.entries(ROTULO_TIPO).map(([value, label]) => ({ value, label }));
// Só os dois destinos reais: "ambos" é o resultado de marcar os dois, não uma
// opção à parte.
const opcoesAplicaEm = [
  { value: 'contato', label: 'Contatos' },
  { value: 'cliente', label: 'Clientes' },
];

const schema = yup.object({
  nome: yup.string().trim().required(msgRequired).max(60, 'Máximo de 60 caracteres'),
  tipo: yup.string().required(msgRequired),
  aplica_em: yup.array().of(yup.string()).min(1, 'Escolha ao menos um'),
  // A obrigatoriedade depende do tipo: um campo de texto não tem opções, e
  // exigi-las sempre travaria o formulário no caso mais comum.
  opcoes: yup.array().when('tipo', {
    is: 'lista',
    then: (s) => s.of(yup.string()).min(1, 'Informe ao menos uma opção'),
    otherwise: (s) => s.notRequired(),
  }),
});

function ModalFormCampo({ visible, onHide, onConfirm, data }: ModalProps) {
  const { podeAdicionar, podeEditar, semPermissao } = usePermissoesModulo('custom.field');

  // Editar exige `:update`; criar, `:add`. Sem a permissão do caso, o
  // formulário abre em somente leitura - quem tem `:view` consulta o cadastro.
  const somenteLeitura = data?.id ? !podeEditar : !podeAdicionar;

  const { control, handleSubmit, reset, watch } = useForm<FormCampo>({
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema),
    defaultValues: defaultForm,
  });

  const tipoEscolhido = watch('tipo');

  // Trocar o tipo de um campo já preenchido transformaria os valores gravados
  // em lixo - "Gerente" não vira número. O backend recusa; aqui o seletor nem
  // é oferecido, para o erro não chegar depois de preencher o resto.
  const tipoBloqueado = Boolean(data?.id);

  useEffect(() => {
    if (visible) {
      reset({
        ...defaultForm,
        ...(data ?? {}),
        aplica_em: data ? aplicaAParaLista(data.aplica_a) : defaultForm.aplica_em,
        opcoes: data?.opcoes ?? [],
      });
    }
  }, [visible, data, reset]);

  const onSubmitForm = (fields: FormCampo) => onConfirm?.(fields);

  const modalFooter = (
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

  return (
    <Modal
      header={data?.id ? 'Alterar campo' : 'Novo campo'}
      visible={visible}
      onHide={onHide}
      footer={modalFooter}
      style={{ width: '32rem' }}
      breakpoints={{ '640px': '95vw' }}
      draggable={false}
      blockScroll
    >
      <div className="grid p-fluid mt-1">
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
                  value={field.value ?? ''}
                  placeholder="Ex.: Origem, Aniversário, CPF"
                  autoComplete="off"
                  disabled={somenteLeitura}
                />
                {getFormErrorMessage(fieldState)}
              </>
            )}
          />
        </div>

        <div className="col-12 md:col-5">
          <Controller
            control={control}
            name="tipo"
            render={({ field, fieldState }) => (
              <>
                <LabelPlus
                  htmlFor={field.name}
                  text="Tipo"
                  required
                  textHelp={
                    tipoBloqueado
                      ? 'O tipo não pode mudar depois de criado: os valores já preenchidos deixariam de fazer sentido.'
                      : undefined
                  }
                />
                <Dropdown
                  id={field.name}
                  {...field}
                  options={opcoesTipo}
                  optionLabel="label"
                  optionValue="value"
                  disabled={tipoBloqueado}
                />
                {getFormErrorMessage(fieldState)}
              </>
            )}
          />
        </div>

        <div className="col-12">
          <Controller
            control={control}
            name="aplica_em"
            render={({ field, fieldState }) => (
              <>
                <LabelPlus
                  htmlFor={field.name}
                  text="Onde aparece"
                  required
                />
                <MultiSelect
                  id={field.name}
                  {...field}
                  value={field.value ?? []}
                  options={opcoesAplicaEm}
                  optionLabel="label"
                  optionValue="value"
                  display="chip"
                  placeholder="Contatos, clientes ou ambos"
                  // Sem filtro: são duas opções, e uma caixa de busca sobre
                  // duas linhas só atrapalha.
                  showClear={false}
                  disabled={somenteLeitura}
                />
                {getFormErrorMessage(fieldState)}
              </>
            )}
          />
        </div>

        {tipoEscolhido === 'lista' && (
          <div className="col-12">
            <Controller
              control={control}
              name="opcoes"
              render={({ field, fieldState }) => (
                <>
                  <LabelPlus
                    htmlFor={field.name}
                    text="Opções"
                    required
                    textHelp="Digite cada opção e tecle Enter."
                  />
                  {/* `Chips` aqui é o componente certo, ao contrário do
                      MultiSelect usado nas etiquetas: o que se digita são
                      valores novos, não escolhas de uma lista existente. */}
                  <Chips
                    id={field.name}
                    {...field}
                    value={field.value ?? []}
                    placeholder="Ex.: Indicação"
                    separator=","
                    addOnBlur
                  />
                  {getFormErrorMessage(fieldState)}
                </>
              )}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

export default ModalFormCampo;
