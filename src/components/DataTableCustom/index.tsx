import { useEffect, useState } from 'react';
import { FilterMatchMode } from 'primereact/api';
import { DataTable, DataTableBaseProps, DataTableValueArray } from 'primereact/datatable';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';

interface IProps<T extends DataTableValueArray> extends DataTableBaseProps<T> {
  children: React.ReactNode;
  dtLoading?: boolean;
}

const DataTableCustom = <P extends DataTableValueArray>({
  children,
  globalFilterFields = null,
  dtLoading = null,
  ...props
}: IProps<P>) => {
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
          icon="pi pi-filter-slash"
          label="Limpar"
          className="p-button-outlined p-button-sm"
          onClick={clearFilter}
        />
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search"> </InputIcon>
          <InputText
            className="p-inputtext-sm"
            value={globalFilterValue}
            placeholder="Pesquisar..."
            onChange={onGlobalFilterChange}
          />
        </IconField>
      </div>
    );
  };

  useEffect(() => {
    initFilters();
  }, [props.value]);

  return (
    <DataTable
      size="small"
      stripedRows
      showGridlines
      rowHover
      removableSort
      className="datatable-responsive"
      header={renderHeaderFilter}
      dataKey={'id'}
      loading={dtLoading}
      sortOrder={1}
      //FILTER
      filters={filters}
      filterDisplay="menu"
      globalFilterFields={globalFilterFields}
      // PAGINATION
      paginator
      rows={10}
      rowsPerPageOptions={[10, 25, 50, 100]}
      currentPageReportTemplate="Mostrando {first} de {last} página(s) de {totalRecords} registros"
      paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      {...props}
    >
      {children}
    </DataTable>
  );
};

export default DataTableCustom;
