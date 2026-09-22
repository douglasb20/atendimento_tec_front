'use client';

import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dialog as Modal } from 'primereact/dialog';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { MultiSelect } from 'primereact/multiselect';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import EditorMensagem from '@/components/EditorMensagem';
import LabelPlus from '@/components/LabelPlus';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';
import { ChannelResponse, ServiceAlertForm, ServiceAlertResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { getFormErrorMessage, msgRequired } from '@/service/Util';

type ModalFormAvisoProps = {
  visible: boolean;
  onHide: () => void;
  data: ServiceAlertResponse | null;
  onConfirm: (fields: ServiceAlertForm) => void;
};

const defaultForm: ServiceAlertForm = {
  titulo: '',
  mensagem: '',
  // Nasce ligado: quem cadastra um aviso está no meio do incidente.
  ativo: true,
  expira_em: null,
  channel_ids: [],
};

const ModalFormAviso = ({ visible, onHide, data, onConfirm }: ModalFormAvisoProps) => {
  const { podeAdicionar, podeEditar, semPermissao } = usePermissoesModulo('service.alert');
  const somenteLeitura = data?.id ? !podeEditar : !podeAdicionar;

  const { control, handleSubmit, reset } = useForm<ServiceAlertForm>({
    defaultValues: defaultForm,
    reValidateMode: 'onBlur',
  });

  const { FetchReq } = useApi();
  const [canais, setCanais] = useState<ChannelResponse[]>([]);

  useEffect(() => {
    if (!visible) return;

    reset({
      ...defaultForm,
      ...(data ?? {}),
      // A API devolve ISO; o `Calendar` precisa de `Date`.
      expira_em: data?.expira_em ? new Date(data.expira_em) : null,
      // A relação vem como objetos; o formulário trabalha com ids.
      channel_ids: data?.channels?.map((c) => c.id) ?? [],
    });
  }, [visible, data, reset]);

  useEffect(() => {
    if (!visible) return;

    const carregar = async () => {
      try {
        setCanais((await FetchReq<ChannelResponse[]>('ListarCanais')) ?? []);
      } catch {
        // Sem a lista, o aviso vale para todos os canais - que é o padrão e o
        // caso mais comum. Alertar aqui atrapalharia quem só quer salvar.
      }
    };

    carregar();
    // `FetchReq` nasce a cada render e entraria em laço aqui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

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
        icon="fa-regular fa-check"
        disabled={somenteLeitura}
        title={somenteLeitura ? semPermissao : undefined}
        onClick={() => handleSubmit((fields) => onConfirm(fields))()}
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
      header={data?.id ? 'Editar aviso' : 'Novo aviso'}
      onHide={onHide}
      footer={rodape}
      position="top"
    >
      <div className="formgrid grid gap-3">
        <div className="col-12 md:col-7">
          <LabelPlus
            text="Título"
            required
            textHelp="Só para você encontrar o aviso nesta lista. O cliente não vê este texto."
          />
          <Controller
            control={control}
            name="titulo"
            rules={{ required: msgRequired }}
            render={({ field, fieldState }) => (
              <>
                <InputText
                  {...field}
                  value={field.value ?? ''}
                  placeholder="Sefaz fora do ar"
                  autoFocus
                  disabled={somenteLeitura}
                />
                {getFormErrorMessage(fieldState)}
              </>
            )}
          />
        </div>

        <div className="col-12 md:col-4 flex align-items-end pb-2">
          <Controller
            control={control}
            name="ativo"
            render={({ field }) => (
              <div className="flex align-items-center gap-3">
                <InputSwitch
                  inputId={field.name}
                  checked={!!field.value}
                  onChange={(e) => field.onChange(!!e.value)}
                  disabled={somenteLeitura}
                />
                <label
                  htmlFor={field.name}
                  className="font-medium"
                >
                  {field.value ? 'Enviando' : 'Desligado'}
                </label>
              </div>
            )}
          />
        </div>

        <div className="col-12">
          <LabelPlus
            text="Mensagem"
            required
            textHelp="Enviada logo após a saudação, só na abertura de um atendimento novo."
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
                  placeholder="Ex.: {{saudacao}}! No momento a Sefaz está fora do ar..."
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

        <div className="col-12 md:col-7">
          <LabelPlus
            text="Canais"
            textHelp="Deixe vazio para enviar em todos os canais."
          />
          <Controller
            control={control}
            name="channel_ids"
            render={({ field }) => (
              <MultiSelect
                {...field}
                value={field.value ?? []}
                options={canais}
                optionLabel="name"
                optionValue="id"
                display="chip"
                filter
                placeholder="Todos os canais"
                emptyMessage="Nenhum canal cadastrado"
                disabled={somenteLeitura}
              />
            )}
          />
        </div>

        <div className="col-12 md:col-4">
          <LabelPlus
            text="Expira em"
            textHelp="Opcional. Sem data, o aviso vale até você desligá-lo."
          />
          <Controller
            control={control}
            name="expira_em"
            render={({ field }) => (
              <Calendar
                {...field}
                value={field.value}
                onChange={(e) => field.onChange(e.value ?? null)}
                showTime
                showButtonBar
                hourFormat="24"
                dateFormat="dd/mm/yy"
                placeholder="Sem prazo"
                // O aviso descreve um problema em curso: marcar prazo no
                // passado só o faria nascer sem efeito.
                minDate={new Date()}
                disabled={somenteLeitura}
              />
            )}
          />
        </div>
      </div>
    </Modal>
  );
};

export default ModalFormAviso;
