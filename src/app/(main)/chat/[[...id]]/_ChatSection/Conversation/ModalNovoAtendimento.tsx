'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { RadioButton } from 'primereact/radiobutton';

import InputTelefone, { somenteDigitos } from '@/components/InputTelefone';
import LabelPlus from '@/components/LabelPlus';
import { ChannelResponse, ChannelStatusId, ContactResponse, SupportChatsResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta, nomeCompleto } from '@/service/Util';

type OrigemContato = 'existente' | 'novo';

type ModalNovoAtendimentoProps = {
  visible: boolean;
  onHide: () => void;
  onCriado: (conversa: SupportChatsResponse) => void;
};

/**
 * Cria uma conversa do zero - o atendente escolhe um contato já cadastrado
 * (com WhatsApp confirmado) ou digita um número novo, e o canal por onde vai
 * sair. Ao confirmar, a conversa abre vazia, pronta para escrever a primeira
 * mensagem manualmente (o backend não manda nada sozinho).
 */
function ModalNovoAtendimento({ visible, onHide, onCriado }: ModalNovoAtendimentoProps) {
  const { FetchReq } = useApi();

  const [origem, setOrigem] = useState<OrigemContato>('existente');
  const [contatos, setContatos] = useState<ContactResponse[]>([]);
  const [canais, setCanais] = useState<ChannelResponse[]>([]);
  const [contactId, setContactId] = useState<number | null>(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [channelId, setChannelId] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const canaisConectados = canais.filter((c) => c.channel_status_id === ChannelStatusId.CONECTADO);
  // Só contato com WhatsApp confirmado pode abrir conversa - sem isso não há
  // JID para enviar mensagem nenhuma.
  const contatosComJid = contatos.filter((c) => c.remote_jid);

  useEffect(() => {
    if (!visible) return;

    setOrigem('existente');
    setContactId(null);
    setPhone('');
    setName('');
    setChannelId(null);

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

    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const podeConfirmar =
    !!channelId && (origem === 'existente' ? !!contactId : !!phone.trim() && !!name.trim());

  const confirmar = async () => {
    try {
      setSalvando(true);

      const body =
        origem === 'existente'
          ? { channel_id: channelId, contact_id: contactId }
          : { channel_id: channelId, phone: somenteDigitos(phone), name: name.trim() };

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
      className="w-11 md:w-6 lg:w-5"
      style={{ minWidth: '22rem' }}
      blockScroll
    >
      <div className="flex flex-column gap-4 p-fluid">
        <div className="flex gap-4">
          <div className="flex align-items-center gap-2">
            <RadioButton
              inputId="origem-existente"
              checked={origem === 'existente'}
              onChange={() => setOrigem('existente')}
            />
            <label htmlFor="origem-existente">Contato existente</label>
          </div>
          <div className="flex align-items-center gap-2">
            <RadioButton
              inputId="origem-novo"
              checked={origem === 'novo'}
              onChange={() => setOrigem('novo')}
            />
            <label htmlFor="origem-novo">Número novo</label>
          </div>
        </div>

        {origem === 'existente' ? (
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
                <span>
                  {nomeCompleto(contato)}{' '}
                  <span className="text-color-secondary">- {contato.phone}</span>
                </span>
              )}
              disabled={carregando}
              emptyMessage="Nenhum contato com WhatsApp confirmado"
            />
          </div>
        ) : (
          <>
            <div>
              <LabelPlus
                text="Nome"
                required
              />
              <InputText
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do contato"
              />
            </div>
            <div>
              <LabelPlus
                text="Telefone"
                required
                textHelp="Escolha o país e digite o número com DDD/código de área. O sistema confirma no WhatsApp antes de criar a conversa."
              />
              <InputTelefone
                value={phone}
                onChange={(valor) => setPhone(valor ?? '')}
              />
            </div>
          </>
        )}

        {canaisConectados.length > 1 && (
          <div>
            <LabelPlus
              text="Canal"
              required
              textHelp="Por qual número da empresa esta conversa vai sair."
            />
            <Dropdown
              value={channelId}
              onChange={(e) => setChannelId(e.value)}
              options={canaisConectados}
              optionLabel="name"
              optionValue="id"
              placeholder="Selecione o canal"
              disabled={carregando}
            />
          </div>
        )}

        {!carregando && canaisConectados.length === 0 && (
          <small className="text-red-500">Nenhum canal conectado no momento.</small>
        )}

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
