'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { InputText } from 'primereact/inputtext';
import { InputMask } from 'primereact/inputmask';
import { Column } from 'primereact/column';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { v4 as uuidv4 } from 'uuid';
import * as yup from 'yup';

import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import { ContactTable, Masks, Shape } from '@/Interfaces';
import { getFormErrorMessage, ValidaCNPJ } from '@/service/Util';
import LabelPlus from '@/components/LabelPlus';
import { DataTable } from 'primereact/datatable';
import AcoesDataTable, { IActionTable } from '@/components/AcoesDataTable';
import ModalFormulario from './ModalFormulario';
import useApi from '@/service/Api/ApiClient';
import { PrimeIcons } from 'primereact/api';

type FormType = {
  nome: string;
  cnpj?: string;
};

const schema = yup.object<yup.AnyObject, Shape<FormType>>({
  nome: yup.string().required(),
  cnpj: yup
    .string()
    .test('cnpj-validator', 'CNPJ inválido', (val) => val !== '' && ValidaCNPJ(val)),
});

const defaultForm: FormType = {
  nome: '',
  cnpj: '',
};

export default function FormClient() {
  const [rendered, setRendered] = useState(false);
  const [contacts, setContacts] = useState<ContactTable[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactTable>(null);
  const [formContactStatus, setFormContactStatus] = useState(false);
  const { FetchReq } = useApi();
  const { control, handleSubmit, reset } = useForm<FormType>({
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema),
  });
  const params = useParams();
  const { id } = params as { id: string[] } | null;

  const ButtonsHeader: IButtonsOthers[] = [
    {
      label: 'Adicionar contato',
      bgColor: 'primary p-button-outlined',
      icon: PrimeIcons.ID_CARD,
      action: () => AbrirModalForm(null),
    },
  ];

  const acoesTable: IActionTable<ContactTable>[] = [
    {
      label: 'Editar cliente',
      tooltip: 'Editar cliente',
      icon: 'pi pi-fw pi-user-edit',
      command: (data) => {},
    },
    {
      label: 'Excluir cliente',
      tooltip: 'Excluir cliente',
      icon: 'pi pi-fw pi-times',
      bgcolor: 'danger',
      command: (data) => {},
    },
  ];

  const AbrirModalForm = (dados: ContactTable | null) => {
    setSelectedContact(dados);
    setFormContactStatus(true);
  };

  const onConfirmContact = (fields: ContactTable) => {
    let editContact: ContactTable[] = [];

    if (!fields.id) {
      editContact = [
        ...contacts,
        {
          id: uuidv4(),
          nome_contato: fields.nome_contato,
          telefone_contato: fields.telefone_contato,
          tipo: 'new'
        }
      ]
    } else {
      editContact = [...contacts];
      let index = editContact.map(e => e.id).indexOf(selectedContact.id);

      editContact[index].nome_contato = fields.nome_contato;
      editContact[index].telefone_contato = fields.telefone_contato;
    }

    setContacts(editContact)
    closeModalContact();
  };

  const RemoveBeneficiario = (fields: ContactTable) => {
    let editContact: ContactTable[] = [];
    if (fields.tipo === 'new') {
    }
    
    editContact = contacts.filter((e) => e.id !== fields.id);
    setContacts(editContact);
  };

  const closeModalContact = () => {
    setFormContactStatus(false);
    setSelectedContact(null);
  }

  useEffect(() => {
    setRendered(true);
  }, []);
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
              </div>
              <div className="grid">
                <div className="col-12 mt-3">
                  <TitleCards
                    title="Contatos"
                    buttons={ButtonsHeader}
                  />
                  <DataTable
                    value={contacts}
                    emptyMessage="Nenhum contato cadastrado"
                    size='small'
                    stripedRows
                    showGridlines
                    rowHover
                  >
                    <Column
                      field="nome_contato"
                      header="Nome"
                      align="center"
                      headerClassName=""
                    />
                    <Column
                      field="telefone_contato"
                      header="Telefone"
                      align="center"
                      headerClassName="w-3"
                    />
                    <Column
                      header="Ações"
                      align="center"
                      headerClassName="w-12rem"
                      body={(rowData) => (
                        <AcoesDataTable
                          rowData={rowData}
                          actions={acoesTable}
                        />
                      )}
                    />
                  </DataTable>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ModalFormulario
          visible={formContactStatus}
          onHide={() => setFormContactStatus(false)}
          data={null}
          onConfirm={onConfirmContact}
        />
      </>
    )
  );
}
