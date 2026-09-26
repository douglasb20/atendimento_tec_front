'use client';
import { useEffect, useState } from 'react';

import { ContactResponse } from '@/Interfaces';
import { useService } from '@/contexts/ServicesContext';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';
import useApi from '@/service/Api/ApiClient';
import { somenteDigitos } from '@/components/InputTelefone';
import { AlertaCallback, CatchAlerta, ConfirmaAcao, sleep } from '@/service/Util';

import { IActionTable } from '@/components/AcoesDataTable';
import TitleCards, { IButtonsOthers } from '@/components/TitleCards';
import DtContatos from './DtContatos';
import ModalFormulario, { ContactFormFields } from './ModalFormulario';

type DadosContatosProps = {
  data: ContactResponse[];
};

/** O contato salvo, com o aviso que o backend acrescenta na criação. */
type ContactSalvo = ContactResponse & { aviso?: string };

export default function DadosContatosSection({ data }: DadosContatosProps) {
  const [contacts, setContacts] = useState<ContactResponse[]>(data || []);
  const [selectedContact, setSelectedContact] = useState<ContactResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const { setLoading } = useService();
  const { podeAdicionar, podeEditar, podeExcluir, semPermissao } =
    usePermissoesModulo('contact');
  const { FetchReq } = useApi();

  // Sem permissão de criar, o botão não aparece: a chamada seria recusada
  // pelo backend de qualquer forma.
  const ButtonsHeader: IButtonsOthers[] = [
    {
      label: 'Adicionar contato',
      icon: 'pi pi-user-plus',
      action: () => onOpenModalForm(null),
      disabled: !podeAdicionar,
      tooltip: podeAdicionar ? undefined : semPermissao,
    },
  ];

  const acoesTable: IActionTable<ContactResponse>[] = [
    {
      // Sempre visível: sem `:update` o cadastro abre em somente leitura.
      label: podeEditar ? 'Editar contato' : 'Visualizar contato',
      tooltip: podeEditar ? 'Editar contato' : 'Ver contato',
      icon: podeEditar ? 'pi pi-fw pi-user-edit' : 'pi pi-fw pi-eye',
      command: (data) => onOpenModalForm(data),
    },
    {
      isHidden: () => !podeExcluir,
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

  /**
   * Grava o contato e recarrega a lista.
   *
   * O backend responde com um `aviso` quando o número não tem WhatsApp ou não
   * pôde ser verificado - o cadastro deu certo nos dois casos, então é aviso e
   * não erro.
   */
  const SalvarContato = async (fields: ContactFormFields) => {
    try {
      setLoading();

      // O campo devolve E.164 (`+556492698043`); a API recebe só dígitos, e o
      // DDI já vem embutido pelo seletor de país.
      const body = {
        name: fields.name,
        // Vazio vira null: o banco distingue "sem sobrenome" de string vazia.
        last_name: fields.last_name?.trim() || null,
        phone: somenteDigitos(fields.phone) || undefined,
        // Sempre enviado, mesmo vazio: array vazio remove os que existiam, e
        // omitir preservaria - quem apagou todas as linhas quis limpar.
        campos: (fields.campos ?? [])
          .filter((c) => c.custom_field_id && c.valor?.trim())
          .map((c) => ({ custom_field_id: c.custom_field_id, valor: c.valor.trim() })),
        ignore_support: Boolean(fields.ignore_support),
        ...(fields.changedAvatar && {
          avatar_url: fields.avatarKey,
          changed_avatar: true,
        }),
      };

      // `aviso` só vem na criação, quando o número não tem WhatsApp ou não pôde
      // ser verificado; declarado aqui para os dois ramos do ternário.
      const salvo = await (selectedContact?.id
        ? FetchReq<ContactSalvo>({
            endpoint: 'AtualizarContato',
            variables: [selectedContact.id],
            body,
          })
        : FetchReq<ContactSalvo>({ endpoint: 'AdicionarContato', body }));

      setModalVisible(false);
      await GetContacts();

      AlertaCallback(
        salvo?.aviso ?? `Contato ${selectedContact?.id ? 'atualizado' : 'cadastrado'} com sucesso!`,
        () => {},
        salvo?.aviso ? 'warning' : 'success',
      );
    } catch (err) {
      CatchAlerta(err, 'Erro ao salvar contato.');
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
          onConfirm={SalvarContato}
          data={selectedContact}
          onContatoAtualizado={(atualizado) => {
            setSelectedContact(atualizado);
            GetContacts();
          }}
        />
      </>
    )
  );
}
