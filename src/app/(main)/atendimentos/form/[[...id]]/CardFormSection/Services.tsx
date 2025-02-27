import { useFieldArray, useFormContext, Controller } from 'react-hook-form';

import { AtendimentoFormType } from '.';
import { useEffect, useState } from 'react';
import { Divider } from 'primereact/divider';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { PrimeIcons } from 'primereact/api';

import { AtendimentoServicos, IServiceResponse } from '@/Interfaces';
import InputDecimal from '@/components/InputDecimal';
import { FormatCurrency } from '@/service/Util';

type ServicesSectionProps = {
  services: IServiceResponse[];
};
export default function ServicesSection(props: ServicesSectionProps) {
  const { services } = props;
  const [inputService, setInputService] = useState({
    id_service: -1,
    valor_cobrado: 0,
  });
  const { control, watch } = useFormContext<AtendimentoFormType>();
  const { fields, append, remove, update } = useFieldArray({
    control: control,
    name: 'services',
    keyName: 'id_field',
  });

  const onChangeServiceDD = (id: number): void => {
    const service = services.find((e) => e.id === id);
    setInputService({ id_service: id, valor_cobrado: +service.valor_servico });
  };

  const onUpdateService = (id: number, valor_cobrado: string): void => {
    setInputService({ id_service: id, valor_cobrado: +valor_cobrado });
  };

  const onAddService = (): void => {
    const service = fields.find((e) => e.id_service === inputService.id_service);

    if (!service) {
      append({
        id: null,
        id_atendimento: watch('id'),
        service: null,
        id_service: inputService.id_service,
        valor_cobrado: inputService.valor_cobrado.toString(),
      });
    } else {
      const index = fields.findIndex((e) => e.id_service === inputService.id_service);
      update(index, {
        ...service,
        valor_cobrado: inputService.valor_cobrado.toString(),
      });
    }
    setInputService({ id_service: -1, valor_cobrado: 0 });
  };

  useEffect(() => {
    remove();
  },[])
  return (
    <>
      <div className="col-12">
        <h5>Serviços</h5>
        <Divider className="mt-0" />
      </div>
      <div className="col-12 md:col-4">
        <Dropdown
          options={services.map((e) => ({ label: e.name, value: e.id }))}
          filter
          value={inputService.id_service}
          onChange={(e) => onChangeServiceDD(e.value)}
        />
      </div>
      <div className="col-12 md:col-4">
        <InputDecimal
          mode="currency"
          value={inputService.valor_cobrado.toString()}
          onChangeDecimal={(val) => setInputService((prev) => ({ ...prev, valor_cobrado: val }))}
        />
      </div>
      <div className="col-12 md:col-4">
        <Button
          label="Adicionar serviço"
          onClick={onAddService}
        />
      </div>
      <div className="col-12">
        <DataTable value={fields}>
          <Column
            header="Serviço"
            align="center"
            body={({ id_service }: AtendimentoServicos) =>
              services.find((e) => e.id === id_service).name
            }
          />
          <Column
            header="Valor cobrado"
            align="center"
            body={({ valor_cobrado }: AtendimentoServicos) => FormatCurrency(valor_cobrado)}
          />
          <Column
            header="Ações"
            align="center"
            body={({ id_service, valor_cobrado }: AtendimentoServicos, options) => (
              <>
                <Button
                  icon={PrimeIcons.PENCIL}
                  onClick={() => onUpdateService(id_service, valor_cobrado)}
                />
                <Button
                  className="ml-1"
                  severity="danger"
                  icon={PrimeIcons.TIMES}
                  onClick={() => remove(options.rowIndex)}
                />
              </>
            )}
          />
        </DataTable>
      </div>
    </>
  );
}

