'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';

import Avatar from '@/components/Avatar';
import LabelPlus from '@/components/LabelPlus';
import {
  ChannelResponse,
  ChannelStatusId,
  ContactResponse,
  DepartmentResponse,
  SupportChatsResponse,
} from '@/Interfaces';
import { useUsuarioLogado } from '@/hooks/useUsuarioLogado';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta, nomeCompleto } from '@/service/Util';

/** Opção sintética: nenhum setor associado à conversa. */
const SEM_SETOR = { id: null as number | null, name: 'Nenhum', color: null as string | null };

/** A bolinha com a cor do setor, ou cinza quando não há cor (ou é "Nenhum"). */
const BolinhaSetor = ({ cor }: { cor: string | null | undefined }) => (
  <span
    className="border-circle flex-none"
    style={{ width: '0.6rem', height: '0.6rem', backgroundColor: cor || 'var(--surface-400)' }}
  />
);

type ModalNovoAtendimentoProps = {
  visible: boolean;
  onHide: () => void;
  onCriado: (conversa: SupportChatsResponse) => void;
};

/**
 * Cria uma conversa do zero - o atendente escolhe a conexão e um contato já
 * cadastrado. Ao confirmar, a conversa abre vazia, pronta para escrever a
 * primeira mensagem manualmente (o backend não manda nada sozinho).
 *
 * Sem a opção de "número novo": além de o cadastro de contato já resolver
 * esse caso, ela deixaria de fazer sentido com mais de um tipo de canal -
 * Telegram/Instagram/Facebook não usam telefone como identidade, e
 * "confirmar no WhatsApp" só existe para esse canal.
 */
function ModalNovoAtendimento({ visible, onHide, onCriado }: ModalNovoAtendimentoProps) {
  const { FetchReq } = useApi();
  const { usuario } = useUsuarioLogado();

  const [contatos, setContatos] = useState<ContactResponse[]>([]);
  const [canais, setCanais] = useState<ChannelResponse[]>([]);
  const [setores, setSetores] = useState<DepartmentResponse[]>([]);
  const [contactId, setContactId] = useState<number | null>(null);
  const [channelId, setChannelId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const canaisConectados = canais.filter((c) => c.channel_status_id === ChannelStatusId.CONECTADO);
  // Só contato com WhatsApp confirmado pode abrir conversa - sem isso não há
  // JID para enviar mensagem nenhuma.
  const contatosComJid = contatos.filter((c) => c.remote_jid);

  // Atendente associado a setor(es) só escolhe entre os dele - sem setor
  // nenhum associado, vê a lista completa (não há o que restringir).
  const setoresDoAtendente = usuario?.departments ?? [];
  const setoresDisponiveis = setoresDoAtendente.length > 0 ? setoresDoAtendente : setores;

  useEffect(() => {
    if (!visible) return;

    setContactId(null);
    setChannelId(null);
    setDepartmentId(null);

    const carregar = async () => {
      try {
        setCarregando(true);
        const [dadosContatos, dadosCanais] = await Promise.all([
          FetchReq<ContactResponse[]>('ListarContatos'),
          FetchReq<ChannelResponse[]>('ListarCanais'),
        ]);
        setContatos(dadosContatos ?? []);
        const conectados = (dadosCanais ?? []).filter(
          (c) => c.channel_status_id === ChannelStatusId.CONECTADO,
        );
        setCanais(dadosCanais ?? []);
        // Único canal conectado: preenche sozinho, sem perguntar.
        if (conectados.length === 1) setChannelId(conectados[0].id);
      } catch (err) {
        CatchAlerta(err, 'Erro ao carregar contatos e canais');
      } finally {
        setCarregando(false);
      }
    };

    // Separado do resto: setor é um campo a mais neste formulário, não um
    // requisito para abrir a conversa. Uma falha aqui (ex.: usuário sem
    // nenhuma permissão que dê acesso à listagem de setores) não pode
    // impedir contatos e canais, que já carregaram, de aparecer - o campo de
    // setor simplesmente some (mesmo padrão do modal de conexão).
    const carregarSetores = async () => {
      try {
        setSetores((await FetchReq<DepartmentResponse[]>('ListarSetores')) ?? []);
      } catch {
        setSetores([]);
      }
    };

    carregar();
    carregarSetores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Único setor do atendente: preenche sozinho, sem perguntar - mesmo
  // critério já usado para canal único conectado.
  useEffect(() => {
    if (setoresDoAtendente.length === 1) setDepartmentId(setoresDoAtendente[0].id);
  }, [setoresDoAtendente]);

  const podeConfirmar = !!channelId && !!contactId;

  const confirmar = async () => {
    try {
      setSalvando(true);

      const body = {
        channel_id: channelId,
        contact_id: contactId,
        department_id: departmentId ?? undefined,
      };

      const conversa = await FetchReq<SupportChatsResponse>({
        endpoint: 'CriarAtendimentoNovo',
        body,
      });

      onCriado(conversa);
      onHide();
    } catch (err) {
      CatchAlerta(err, 'Erro ao criar o atendimento');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      header="Novo atendimento"
      visible={visible}
      onHide={onHide}
      className="w-11 md:w-6 lg:w-3"
      style={{ minWidth: '15rem' }}
      blockScroll
    >
      <div className="flex flex-column gap-4 p-fluid">
        <div>
          <LabelPlus
            text="Conexão"
            required
            textHelp="Por qual número da empresa esta conversa vai sair."
          />
          <Dropdown
            value={channelId}
            onChange={(e) => setChannelId(e.value)}
            options={canaisConectados}
            optionLabel="name"
            optionValue="id"
            placeholder="Selecione a conexão"
            disabled={carregando}
          />
        </div>

        {!carregando && canaisConectados.length === 0 && (
          <small className="text-red-500">Nenhum canal conectado no momento.</small>
        )}

        {setoresDisponiveis.length > 0 && (
          <div>
            <LabelPlus
              text="Departamento"
              textHelp="O setor responsável por esta conversa. Se você já atende por um setor específico, só ele aparece aqui."
            />
            <Dropdown
              value={departmentId}
              onChange={(e) => setDepartmentId(e.value)}
              options={[SEM_SETOR, ...setoresDisponiveis]}
              optionLabel="name"
              optionValue="id"
              placeholder="Selecione o setor"
              disabled={carregando || !channelId}
              itemTemplate={(setor: DepartmentResponse) => (
                <span className="flex align-items-center gap-2">
                  <BolinhaSetor cor={setor.color} />
                  {setor.name}
                </span>
              )}
              valueTemplate={(setor: DepartmentResponse | undefined) =>
                setor ? (
                  <span className="flex align-items-center gap-2">
                    <BolinhaSetor cor={setor.color} />
                    {setor.name}
                  </span>
                ) : (
                  <span className="text-color-secondary">Selecione o setor</span>
                )
              }
            />
          </div>
        )}

        <div>
          <LabelPlus
            text="Contato"
            required
          />
          <Dropdown
            value={contactId}
            onChange={(e) => setContactId(e.value)}
            options={contatosComJid}
            optionLabel="name"
            optionValue="id"
            filter
            filterBy="name,phone"
            placeholder="Buscar por nome ou telefone..."
            itemTemplate={(contato: ContactResponse) => (
              <span className="flex align-items-center gap-2">
                <Avatar
                  src={contato.avatar_url}
                  alt={nomeCompleto(contato) || 'Contato'}
                  width={32}
                  height={32}
                  className="border-circle flex-none"
                  style={{ objectFit: 'cover' }}
                />
                <span className="flex flex-column min-w-0">
                  <span className="font-medium white-space-nowrap overflow-hidden text-overflow-ellipsis">
                    {nomeCompleto(contato)}
                  </span>
                  <span className="text-color-secondary text-sm">{contato.phone}</span>
                </span>
              </span>
            )}
            disabled={carregando || !channelId}
            emptyMessage="Nenhum contato com WhatsApp confirmado"
            // `.p-dropdown-item` já é `display: flex`; a borda entra aqui,
            // não no `itemTemplate`, porque o `<span>` do template não
            // estica sozinho até a largura do item da lista.
            pt={{ item: { className: 'border-bottom-1 surface-border' } }}
          />
        </div>

        <div className="flex justify-content-end">
          <Button
            label="Criar atendimento"
            loading={salvando}
            disabled={!podeConfirmar || carregando}
            onClick={confirmar}
          />
        </div>
      </div>
    </Modal>
  );
}

export default ModalNovoAtendimento;
