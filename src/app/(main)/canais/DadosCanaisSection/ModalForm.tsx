import { memo, useEffect, useState } from 'react';
import { Dialog as Modal } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { useForm, Controller } from 'react-hook-form';

import LabelPlus from '@/components/LabelPlus';
import { ChannelResponse, IntegrationResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta, getFormErrorMessage, msgRequired } from '@/service/Util';

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
};

/** Opção que representa "sem vínculo" — o canal cai na integração padrão. */
const USAR_PADRAO = { id: null as number | null, name: 'Usar a integração padrão' };

const ModalForm = (props: IProps<ChannelResponse>) => {
  const { visible, onHide, value, onComplete } = props;
  const { control, handleSubmit, reset } = useForm<ChannelResponse>({
    reValidateMode: 'onBlur',
  });
  const { FetchReq } = useApi();
  const [integracoes, setIntegracoes] = useState<IntegrationResponse[]>([]);

  const onSubmit = async (data: ChannelResponse) => {
    onComplete && onComplete(data);
  };

  useEffect(() => {
    reset({
      ...defaultValues,
      ...value,
    });
  }, [visible, value]);

  // Carregadas ao abrir: a lista muda pouco, mas cadastrar uma integração nova
  // e voltar aqui sem vê-la na seleção seria confuso.
  useEffect(() => {
    if (!visible) return;

    const carregar = async () => {
      try {
        const dados = await FetchReq<IntegrationResponse[]>('ListarIntegracoes');
        setIntegracoes((dados ?? []).filter((i) => i.is_active));
      } catch (err) {
        CatchAlerta(err, 'Não foi possível carregar as integrações');
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
        className="w-11 md:w-6 lg:w-4"
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
                  />
                  {getFormErrorMessage(fieldState)}
                </>
              )}
            />
          </div>

          <div className="col-12 p-fluid">
            <LabelPlus
              text="Integração"
              textHelp="Qual servidor de provider atende este canal. Deixando na padrão, o canal segue a integração marcada como tal — o que basta quando há um servidor só."
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
                />
              )}
            />
          </div>
          <div className="col-12 flex justify-content-end ">
            <Button
              label="Salvar"
              onClick={() => handleSubmit(onSubmit)()}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default memo(ModalForm);
