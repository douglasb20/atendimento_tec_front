import React, { useEffect, useState, memo } from 'react';
import { FilterMatchMode } from 'primereact/api';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';

import AcoesDataTable from 'components/AcoesDataTable';

const DtBancoImagem = ({ actions, ...props }) => {
  const [filters, setFilters] = useState(null);
  const [globalFilterValue, setGlobalFilterValue] = useState('');

  const clearFilter = () => {
    initFilters();
  };

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    let _filters = { ...filters };
    _filters['global'].value = value;

    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const initFilters = () => {
    setFilters({
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    });
    setGlobalFilterValue('');
  };

  const renderHeaderFilter = () => {
    return (
      <div className="flex justify-content-between">
        <Button
          type="button"
          label="Limpar busca"
          className="p-button-outlined p-button-sm p-button-warning"
          onClick={clearFilter}
        />
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            className="p-inputtext-sm"
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder="Pesquisar..."
          />
        </span>
      </div>
    );
  };

  useEffect(() => {
    initFilters();
  }, [props.value]);

  return (
    <>
      <DataTable
        stripedRows
        showGridlines
        removableSort
        rowHover
        size="small"
        className="datatable-responsive"
        value={props.value}
        emptyMessage="Nenhum cliente encontrado"
        responsiveLayout="stack"
        header={renderHeaderFilter}
        dataKey="id"
        loading={props.dtLoading ? props.dtLoading : false}
        sortOrder={1}
        //FILTER
        filters={filters}
        filterDisplay="menu"
        globalFilterFields={['descricao_arquivo']}
        // PAGINATION
        paginator
        rows={10}
        rowsPerPageOptions={[10, 25, 50, 100]}
        currentPageReportTemplate="Mostrando {first} de {last} de {totalRecords}"
        paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      >
        <Column
          field="id"
          header="#"
          align="center"
          headerClassName="w-1 "
        />
        <Column
          field="nome"
          header="Nome"
          // headerClassName="w-3 "
          alignHeader="center"
        />
        <Column
          field="cnpj"
          header="CNPJ"
          // headerClassName="w-3 "
          alignHeader="center"
        />
        <Column
          hidden={!actions ? true : false}
          header="Ações"
          align="center"
          headerClassName="w-12rem"
          body={(rowData) => (
            <AcoesDataTable
              rowData={rowData}
              actions={actions}
            />
          )}
        />
      </DataTable>
    </>
  );
};

export default memo(DtBancoImagem);
