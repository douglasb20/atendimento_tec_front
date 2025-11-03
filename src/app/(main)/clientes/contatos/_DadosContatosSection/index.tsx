'use client';
import { useEffect, useState } from 'react';

import { ContactResponse } from '@/Interfaces';
import { useService } from '@/contexts/ServicesContext';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta, ConfirmaAcao, sleep } from '@/service/Util';

import { IActionTable } from '@/components/AcoesDataTable';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import DtContatos from './DtContatos';
import ModalFormulario from './ModalFormulario';

type DadosContatosProps = {
  data: ContactResponse[];
};

export default function DadosContatosSection({ data }: DadosContatosProps) {
  const [contacts, setContacts] = useState<ContactResponse[]>(data || []);
  const [selectedContact, setSelectedContact] = useState<ContactResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const { setLoading } = useService();
  const { FetchReq } = useApi();

  const ButtonsHeader: IButtonsOthers[] = [
    {
      label: 'Adicionar contato',
      icon: 'pi pi-user-plus',
      action: () => onOpenModalForm(null),
    },
  ];

  const acoesTable: IActionTable<ContactResponse>[] = [
    {
      label: 'Editar contato',
      tooltip: 'Editar contato',
      icon: 'pi pi-fw pi-user-edit',
      command: (data) => onOpenModalForm(data),
    },
    {
      label: 'Excluir contato',
      tooltip: 'Excluir contato',
      icon: 'pi pi-fw pi-times',
      bgcolor: 'danger',
      command: (data) => ConfirmaAcao('Confirma remover este contato?', RemoverContato, data),
    },
  ];

  const GetContacts = async () => {
    try {
      setLoading(true);
      const data = await FetchReq<ContactResponse[]>('ListarContatos');
      setContacts(data);
    } catch (err) {
      CatchAlerta(err, 'Erro ao consultar contatos');
    } finally {
      setLoading(false);
    }
  };

  const RemoverContato = async (data: ContactResponse) => {
    try {
      setLoading();
      await FetchReq('RemoverContato', [data.id]);
      await sleep(1);
      await GetContacts();
    } catch (err) {
      CatchAlerta(err, 'Erro ao remover contato.');
    } finally {
      setLoading(false);
    }
  };

  const onOpenModalForm = (data?: ContactResponse) => { 
    setSelectedContact(data || null);
    setModalVisible(true);
  };

  useEffect(() => {
    setRendered(true);
  }, []);
  return (
    rendered && (
      <>
        <TitleCards
          title="Contatos"
          buttons={ButtonsHeader}
        />

        <div className="p-card-content">
          <DtContatos
            actions={acoesTable}
            value={contacts}
          />
        </div>
        <ModalFormulario
          visible={modalVisible}
          onHide={() => setModalVisible(false)}
          onConfirm={() => {}}
          data={selectedContact}
        />
      </>
    )
  );
}
