'use client';
import { useEffect, useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { classNames } from 'primereact/utils';
import { useForm, Controller } from 'react-hook-form';
import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';

import useApi from '@/service/Api/ApiClient';
import { useService } from '@/contexts/ServicesContext';
import { IActions } from '@/Interfaces';
import { Alerta, CatchAlerta, ConfirmaAcao, AlertaCallback } from '@/service/Util';
import DtBancoImagem from './DtClientes';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import CustomInputFile from 'components/CustomInputFile';

export default function BancoImagens() {
  const { control, register, handleSubmit, reset } = useForm();
  const { FetchReq } = useApi();
  const { setLoading } = useService();
  const [values, setValues] = useState([]);

  const ButtonsHeader: IButtonsOthers[] = [
    {
      label: 'Adicionar Imagem',
      icon: 'pi pi-plus',
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

  const acoesTable: IActions<any> = [
    {
      label: 'Visualizar imagem',
      tooltip: 'Visualizar imagem',
      icon: 'pi pi-fw pi-eye',
      command: (data) => {},
    },
    {
      label: 'Excluir imagem',
      tooltip: 'Excluir imagem',
      icon: 'pi pi-fw pi-times',
      bgcolor: 'danger',
      command: (data) => {},
    },
  ];

  useEffect(() => {}, []);

  return (
    <>
      <div className="grid">
        <div className="col-12 card flex flex-column justify-content-center shadow-1">
          <TitleCards
            title="Clientes"
            buttons={ButtonsHeader}
          />

          <div className="p-card-content">
            <DtBancoImagem
              actions={acoesTable}
              value={values}
            />
          </div>
        </div>
      </div>

      <Modal
        footer={modalFooter}
        resizable={false}
        header="Adicionar nova imagem"
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
      </Modal>
    </>
  );
}
