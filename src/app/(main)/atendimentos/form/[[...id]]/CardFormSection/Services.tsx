import { useFieldArray, useFormContext } from 'react-hook-form';

import { AtendimentoFormType } from '.';
import { useState } from 'react';
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
    service_id: -1,
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
    setInputService({ service_id: id, valor_cobrado: +service.valor_servico });
  };

  const onUpdateService = (id: number, valor_cobrado: string): void => {
    setInputService({ service_id: id, valor_cobrado: +valor_cobrado });
  };

  const onAddService = (): void => {
    const service = fields.find((e) => e.service_id === inputService.service_id);

    if (!service) {
      append({
        id: null,
        atendimento_id: watch('id'),
        service: null,
        service_id: inputService.service_id,
        valor_cobrado: inputService.valor_cobrado.toString(),
      });
    } else {
      const index = fields.findIndex((e) => e.service_id === inputService.service_id);
      update(index, {
        ...service,
        valor_cobrado: inputService.valor_cobrado.toString(),
      });
    }
    setInputService({ service_id: -1, valor_cobrado: 0 });
  };

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
          value={inputService.service_id}
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
          disabled={inputService.service_id === -1}
          label="Adicionar serviço"
          onClick={onAddService}
        />
      </div>
      <div className="col-12">
        <DataTable value={fields}>
          <Column
            header="Serviço"
            align="center"
            body={({ service_id }: AtendimentoServicos) =>
              services.find((e) => e.id === service_id).name
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
            body={({ service_id, valor_cobrado }: AtendimentoServicos, options) => (
              <>
                <Button
                  className="py-2"
                  icon={PrimeIcons.PENCIL}
                  onClick={() => onUpdateService(service_id, valor_cobrado)}
                />
                <Button
                  className="ml-1 py-2"
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
