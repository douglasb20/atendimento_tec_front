'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';

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
import { CatchAlerta } from '@/service/Util';
import { ContatoCompartilhado, chaveDoTelefone } from '@/service/Vcard';
import { useChatStore } from '@/store/useChatStore';

type ModalContatoCompartilhadoProps = {
  visible: boolean;
  onHide: () => void;
  contatos: ContatoCompartilhado[];
};

/** Uma linha por número: o mesmo cartão pode trazer vários. */
type Entrada = { chave: string; nome: string; digitos: string; exibicao: string };

const SEM_SETOR = { id: null as number | null, name: 'Nenhum', color: null as string | null };

/**
 * O que fazer com um contato compartilhado na conversa.
 *
 * Cada número é cruzado com os contatos cadastrados: cadastrado, oferece
 * "Conversar" (que pede conexão e setor); não cadastrado, oferece "Cadastrar",
 * e ao cadastrar a linha vira "Conversar". Com um número só, o formulário de
 * conexão e setor já abre aberto - não há o que escolher antes.
 */
export default function ModalContatoCompartilhado({
  visible,
  onHide,
  contatos,
}: ModalContatoCompartilhadoProps) {
  const { FetchReq } = useApi();
  const { usuario } = useUsuarioLogado();
  const updateChat = useChatStore((s) => s.updateChat);
  const setActiveChat = useChatStore((s) => s.setActiveChat);
  const addMessages = useChatStore((s) => s.addMessages);

  const [cadastrados, setCadastrados] = useState<ContactResponse[]>([]);
  const [canais, setCanais] = useState<ChannelResponse[]>([]);
  const [setores, setSetores] = useState<DepartmentResponse[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);
  const [channelId, setChannelId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);

  const entradas: Entrada[] = useMemo(
    () =>
      contatos.flatMap((c) =>
        c.telefones.map((t) => ({
          chave: chaveDoTelefone(t.digitos),
          nome: c.nome,
          digitos: t.digitos,
          exibicao: t.exibicao,
        })),
      ),
    [contatos],
  );

  const canaisConectados = canais.filter((c) => c.channel_status_id === ChannelStatusId.CONECTADO);
  const setoresDoAtendente = usuario?.departments ?? [];
  const setoresDisponiveis = setoresDoAtendente.length > 0 ? setoresDoAtendente : setores;

  const cadastradoDe = (entrada: Entrada) =>
    cadastrados.find(
      (c) => c.remote_jid && chaveDoTelefone(c.remote_jid.split('@')[0]) === entrada.chave,
    ) ?? cadastrados.find((c) => chaveDoTelefone(c.phone) === entrada.chave);

  const carregarContatos = async () => {
    setCadastrados((await FetchReq<ContactResponse[]>('ListarContatos')) ?? []);
  };

  useEffect(() => {
    if (!visible) return;

    setChannelId(null);
    setDepartmentId(null);
    // Um número só: nada a escolher antes, o formulário já abre.
    setAberta(entradas.length === 1 ? entradas[0].chave : null);

    const carregar = async () => {
      try {
        setCarregando(true);
        const [, dadosCanais] = await Promise.all([
          carregarContatos(),
          FetchReq<ChannelResponse[]>('ListarCanais'),
        ]);
        const conectados = (dadosCanais ?? []).filter(
          (c) => c.channel_status_id === ChannelStatusId.CONECTADO,
        );
        setCanais(dadosCanais ?? []);
        if (conectados.length === 1) setChannelId(conectados[0].id);
      } catch (err) {
        CatchAlerta(err, 'Erro ao carregar contatos e conexões');
      } finally {
        setCarregando(false);
      }
    };

    // Setor é um campo a mais, não requisito: a falha aqui só o esconde.
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

  useEffect(() => {
    if (setoresDoAtendente.length === 1) setDepartmentId(setoresDoAtendente[0].id);
  }, [setoresDoAtendente]);

  const cadastrar = async (entrada: Entrada) => {
    try {
      setProcessando(entrada.chave);
      await FetchReq({
        endpoint: 'AdicionarContato',
        body: { name: entrada.nome, phone: entrada.digitos },
      });
      await carregarContatos();
      // Cadastrado, segue para o "Conversar" sem outro clique.
      setAberta(entrada.chave);
    } catch (err) {
      CatchAlerta(err, 'Não foi possível cadastrar o contato');
    } finally {
      setProcessando(null);
    }
  };

  const conversar = async (contato: ContactResponse, chave: string) => {
    try {
      setProcessando(chave);
      const conversa = await FetchReq<SupportChatsResponse>({
        endpoint: 'CriarAtendimentoNovo',
        body: {
          channel_id: channelId,
          contact_id: contato.id,
          department_id: departmentId ?? undefined,
        },
      });

      updateChat(conversa);
      // Mesmo caminho de abrir uma conversa pela lista: mensagens, conversa
      // ativa e a URL.
      const dados = await FetchReq<SupportChatsResponse>('ListarMensagensPorAtendimentoId', [
        conversa.id,
      ]);
      addMessages(dados.supportChatMessages);
      setActiveChat(dados);
      window.history.replaceState(null, '', `/chat/${conversa.id}`);
      onHide();
    } catch (err) {
      CatchAlerta(err, 'Erro ao criar o atendimento');
    } finally {
      setProcessando(null);
    }
  };

  return (
    <Modal
      header={entradas.length > 1 ? 'Contatos compartilhados' : 'Contato compartilhado'}
      visible={visible}
      onHide={onHide}
      className="w-11 md:w-6 lg:w-4"
      style={{ minWidth: '15rem' }}
      blockScroll
    >
      <div className="flex flex-column gap-3">
        {entradas.map((entrada) => {
          const contato = cadastradoDe(entrada);
          const expandida = aberta === entrada.chave && !!contato;

          return (
            <div
              key={`${entrada.chave}-${entrada.nome}`}
              className="border-1 surface-border border-round-lg p-3 flex flex-column gap-3"
            >
              <div className="flex align-items-center gap-2">
                <div className="flex flex-column flex-1 min-w-0">
                  <span className="font-semibold white-space-nowrap overflow-hidden text-overflow-ellipsis">
                    {entrada.nome}
                  </span>
                  <span className="text-sm text-color-secondary">{entrada.exibicao}</span>
                </div>

                {!contato && (
                  <Button
                    label="Cadastrar"
                    icon="fa-regular fa-user-plus"
                    size="small"
                    outlined
                    loading={processando === entrada.chave}
                    disabled={carregando}
                    onClick={() => cadastrar(entrada)}
                  />
                )}

                {contato && !expandida && (
                  <Button
                    label="Conversar"
                    icon="fa-regular fa-comment"
                    size="small"
                    disabled={carregando}
                    onClick={() => setAberta(entrada.chave)}
                  />
                )}
              </div>

              {expandida && contato && (
                <div className="flex flex-column gap-3 p-fluid">
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
                    {!carregando && canaisConectados.length === 0 && (
                      <small className="text-red-500">Nenhum canal conectado no momento.</small>
                    )}
                  </div>

                  {setoresDisponiveis.length > 0 && (
                    <div>
                      <LabelPlus
                        text="Departamento"
                        textHelp="O setor responsável por esta conversa."
                      />
                      <Dropdown
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.value)}
                        options={[SEM_SETOR, ...setoresDisponiveis]}
                        optionLabel="name"
                        optionValue="id"
                        placeholder="Selecione o setor"
                        disabled={carregando || !channelId}
                      />
                    </div>
                  )}

                  <div className="flex justify-content-end">
                    <Button
                      label="Iniciar conversa"
                      icon="fa-regular fa-comment"
                      loading={processando === entrada.chave}
                      disabled={!channelId || carregando}
                      onClick={() => conversar(contato, entrada.chave)}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
