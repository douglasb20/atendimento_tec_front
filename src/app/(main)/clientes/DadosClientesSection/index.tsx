'use client'
import React, { useEffect, useState } from 'react';
import { Dialog as Modal } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Controller, useForm } from 'react-hook-form';
import { Button } from 'primereact/button';

import { useService } from '@/contexts/ServicesContext';
import CustomInputFile from '@/components/CustomInputFile';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import { IActionTable, IClientes } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient'
import DtClientes from '../DtClientes';
import { CatchAlerta } from '@/service/Util';

export default function DadosClientesSection() {
  const [clients, setClients] = useState([])
  const [rendered, setRendered] = useState(false);
  const { control, handleSubmit } = useForm();
  const { setLoading } = useService();
  const { FetchReq } = useApi();

  const ButtonsHeader: IButtonsOthers[] = [
    {
      label: 'Adicionar cliente',
      icon: 'pi pi-user-plus',
      action: () => { },
    },
  ];

  const modalFooter = () => {
    return (
      <div className={`mt-1`}>
        <Button
          type="button"
          label={'Salvar'}
          onClick={(e) => handleSubmit(() => {})(e)}
        />
      </div>
    );
  };

  const acoesTable: IActionTable<IClientes>[] = [
    {
      label: 'Editar cliente',
      tooltip: 'Editar cliente',
      icon: 'pi pi-fw pi-user-edit',
      command: (data) => { },
    },
    {
      label: 'Excluir cliente',
      tooltip: 'Excluir cliente',
      icon: 'pi pi-fw pi-times',
      bgcolor: 'danger',
      command: (data) => {},
    },
  ];

  const GetClients = async () => {
    try {
      setLoading(true);
      const data = await FetchReq<IClientes[]>('ListarClientes');
      setClients(data);
    } catch (err) {
      console.log(err)
      CatchAlerta(err, "Erro ao consultar clientes");
    } finally {
      setLoading(false);
      setRendered(true);
    }
  }

  useEffect(() => {
    GetClients();
  }, [])
  return rendered && (
    <>
      <TitleCards
        title="Clientes"
        buttons={ButtonsHeader}
      />

      <div className="p-card-content">
        <DtClientes
          actions={acoesTable}
          value={clients}
        />
      </div>

      {/* <Modal
        footer={modalFooter}
        resizable={false}
        header="Adicionar cliente"
        visible={false}
        className="w-11 md:w-9 lg:w-7 xl:w-5"
        onHide={() => {}}
        blockScroll
        maskStyle={{ zIndex: 9 }}
      >
        <div className="card p-fluid">
          <div className="field">
            <label
              htmlFor="descricao_arquivo"
              className="label-required"
            >
              Descrição do arquivo
            </label>

            <InputText
              {...register('descricao_arquivo', {
                required: { value: true, message: 'Campo não pode ficar em branco' },
                setValueAs: (v) => v.toUpperCase(),
              })}
              className="shadow-none"
              id="descricao_arquivo"
              name="descricao_arquivo"
              type="text"
            />
          </div>
          <div className="field">
            <label
              htmlFor="picture"
              className="label-required"
            >
              Arquivo
            </label>
            <div className="flex flex-row align-items-center justify-content-between">
              <Controller
                control={control}
                name="inputImage"
                render={({ field }) => {
                  return (
                    <CustomInputFile
                      {...field}
                      label="Escolher imagem..."
                      id="inputImage"
                      name="inputImage"
                      accepts=".png, .jpg, .jpeg"
                    />
                  );
                }}
              />
              <img
                id="imgNewPreview"
                src="#"
                className="max-w-10rem max-h-10rem hidden"
                alt="Image Preview"
              />
            </div>
          </div>
        </div>
      </Modal> */}
    </>
  );
}
