'use client';
import { yupResolver } from '@hookform/resolvers/yup';
import { useParams } from 'next/navigation';
import { Button } from 'primereact/button';
import { Column, ColumnBodyOptions } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputMask } from 'primereact/inputmask';
import { InputText } from 'primereact/inputtext';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';

import { ContactResponse, IClientResponse, Masks, Shape, TagResponse } from '@/Interfaces';

import AcoesDataTable from '@/components/AcoesDataTable';
import LabelPlus from '@/components/LabelPlus';
import TitleCards from '@/components/TitleCards';
import useApi from '@/service/Api/ApiClient';
import {
  AlertaRedireciona,
  CatchAlerta,
  getFormErrorMessage,
  Mask,
  msgRequired,
  ValidaCNPJ,
} from '@/service/Util';

import { MultiSelect } from 'primereact/multiselect';

import ChipTag from '@/components/ChipTag';
import { useService } from '@/contexts/ServicesContext';

type FormType = {
  nome: string;
  cnpj?: string;
  tag_ids?: number[];
};

const schema = yup.object<yup.AnyObject, Shape<FormType>>({
  nome: yup.string().required(msgRequired),
  cnpj: yup
    .string()
    .test('cnpj-validator', 'CNPJ inválido', (val) => val === '' || ValidaCNPJ(val)),
  tag_ids: yup.array().of(yup.number()).notRequired(),
});

const defaultForm: FormType = {
  nome: '',
  cnpj: '',
  tag_ids: [],
};

const BodyTelefone = (data: ContactResponse, options: ColumnBodyOptions) => {
  let value: string = data[options.field];
  if (value) {
    const maskType = value.length === 11 ? '(##) # ####-####' : '(##) ####-####';
    value = Mask(value, maskType);
  }

  return value;
};

export default function FormClient() {
  const [rendered, setRendered] = useState(false);
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [tags, setTags] = useState<TagResponse[]>([]);
  const { FetchReq } = useApi();
  const { control, handleSubmit, reset } = useForm<FormType>({
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema),
  });
  const { setLoading } = useService();
  const params = useParams();
  const { id } = params as { id: string[] } | null;

  const onSubmitForm = async (fields) => {
    try {
      setLoading(true);

      const dataPost = {
        ...(id !== undefined && { id: id[0] }),
        ...fields,
        cnpj: fields.cnpj.replace(/\D/g, ''),
      };
      if (id === undefined) {
        await FetchReq({
          endpoint: 'CriarCliente',
          body: dataPost,
        });
      } else {
        await FetchReq({
          endpoint: 'AtualizarCliente',
          body: dataPost,
          variables: [id[0]],
        });
      }
      AlertaRedireciona('Cliente salvo com sucesso!', '/clientes', 'success');
    } catch (err) {
      CatchAlerta(err, 'Erro ao salvar cliente');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Opções do MultiSelect. Carregadas aqui, e não no server component, porque o
   * formulário inteiro é client — é o mesmo caminho que o resto da tela usa.
   */
  const ListarTags = async () => {
    try {
      const dados = await FetchReq<TagResponse[]>('ListarTags');
      setTags(dados ?? []);
    } catch {
      // Silencioso: sem etiquetas o campo fica vazio, e o cadastro do cliente
      // continua utilizável. Um alerta aqui atrapalharia mais do que ajuda.
    }
  };

  const GetClient = async (id: string) => {
    try {
      setLoading(true);
      const data = await FetchReq<IClientResponse>('BuscarClienteId', [id]);
      const oldContact = data.contacts;
      data.cnpj = data.cnpj === null ? '' : data.cnpj;
      // A relação sai do reset e vira lista de ids: o MultiSelect trabalha com
      // os ids, não com as entidades.
      const tagIds = (data.tags ?? []).map((t) => t.id);
      delete data.contacts;
      delete data.tags;
      reset({ ...defaultForm, ...data, tag_ids: tagIds });
      setContacts(oldContact || []);
      setRendered(true);
    } catch (err) {
      CatchAlerta(err, 'Erro ao consultar cliente', '/clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    ListarTags();

    if (id === undefined) {
      setRendered(true);
      reset(defaultForm);
    } else {
      GetClient(id[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    rendered && (
      <>
        <div className="grid">
          <div className="col-10 col-offset-1 card flex flex-column justify-content-center shadow-1">
            <TitleCards title="Cadastro de clientes" />

            <div className="p-card-content">
              <div className="grid p-fluid">
                <div className="col-6">
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
                          placeholder="Nome da empresa"
                        />
                        {getFormErrorMessage(fieldState)}
                      </>
                    )}
                  />
                </div>
                <div className="col-6">
                  <Controller
                    control={control}
                    name="cnpj"
                    render={({ field, fieldState }) => (
                      <>
                        <LabelPlus
                          htmlFor={field.name}
                          text="CNPJ"
                        />
                        <InputMask
                          id={field.name}
                          {...field}
                          placeholder="00.000.000/0000-00"
                          mask={Masks.CNPJ}
                        />
                        {getFormErrorMessage(fieldState)}
                      </>
                    )}
                  />
                </div>

                <div className="col-12">
                  <Controller
                    control={control}
                    name="tag_ids"
                    render={({ field, fieldState }) => (
                      <>
                        <LabelPlus
                          htmlFor={field.name}
                          text="Etiquetas"
                        />
                        <MultiSelect
                          id={field.name}
                          value={field.value}
                          onChange={(e) => field.onChange(e.value)}
                          options={tags}
                          optionLabel="name"
                          optionValue="id"
                          display="chip"
                          filter
                          showClear
                          placeholder="Selecione as etiquetas"
                          emptyMessage="Nenhuma etiqueta cadastrada"
                          emptyFilterMessage="Nenhuma etiqueta encontrada"
                          // A cor é metade do valor de uma etiqueta: sem ela, a
                          // lista vira texto e o atendente não a reconhece.
                          itemTemplate={(tag: TagResponse) => <ChipTag tag={tag} />}
                          selectedItemTemplate={(id: number) => {
                            const tag = tags.find((t) => t.id === id);
                            return tag ? (
                              <ChipTag
                                tag={tag}
                                className="mr-1"
                              />
                            ) : null;
                          }}
                        />
                        {getFormErrorMessage(fieldState)}
                      </>
                    )}
                  />
                </div>
              </div>

              <div className="grid">
                <div className="col-12 mt-3">
                  <TitleCards title="Contatos" />
                  <DataTable
                    value={contacts}
                    emptyMessage="Nenhum contato cadastrado"
                    stripedRows
                    showGridlines
                    rowHover
                    size="small"
                  >
                    <Column
                      field="name"
                      header="Nome"
                      align="center"
                      headerClassName=""
                    />
                    <Column
                      field="phone"
                      header="Telefone"
                      align="center"
                      headerClassName="w-3"
                      body={BodyTelefone}
                    />
                    <Column
                      header="Ações"
                      align="center"
                      headerClassName="w-12rem"
                      body={(rowData) => <AcoesDataTable rowData={rowData} />}
                    />
                  </DataTable>
                </div>
              </div>
            </div>

            <div className="p-card-footer mt-4 flex flex-row justify-content-between">
              <Button
                label="Cancelar"
                severity="danger"
                outlined
                onClick={() => {
                  setLoading(true);
                  window.location.assign('/clientes');
                }}
              />
              <Button
                label="Salvar"
                onClick={() => handleSubmit(onSubmitForm)()}
              />
            </div>
          </div>
        </div>
      </>
    )
  );
}
