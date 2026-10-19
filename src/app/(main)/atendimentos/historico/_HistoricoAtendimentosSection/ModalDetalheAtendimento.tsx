'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog as Modal} from 'primereact/dialog';
import { Divider } from 'primereact/divider';
import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressSpinner } from 'primereact/progressspinner';

import { SupportChatsResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta, DateToBR, duracaoCompacta, nomeCompleto } from '@/service/Util';
import BolhaMensagemHistorico from './BolhaMensagemHistorico';

type Props = {
  /** `support_chats.id` do atendimento a detalhar; `null` mantém o modal fechado. */
  chatId: string | null;
  onHide: () => void;
};

/** `19/10/2026, 20:26:32` - data e hora com segundos, como a referência pede. */
const dataHoraCompleta = (valor: string | null) =>
  valor ? DateToBR(valor, 'dd/MM/yyyy, HH:mm:ss') : '-';

/**
 * Modal de detalhe de um atendimento, para a tela de Histórico.
 *
 * Reaproveita `GET /support-chats/:id/messages` (mesmo endpoint do chat ao
 * vivo) - a entidade já vem com `contact`, `user`, `supportChatMessages` e
 * `supportChatEvents` resolvidos. Como o atendimento já terminou, o modal é
 * só leitura: sem socket, sem outbox, sem ações.
 *
 * A timeline de eventos **não mostra pausa/retomada** (pedido explícito): a
 * duração exibida já desconta o tempo pausado no cálculo do backend
 * (`paused_total_seconds`), então a pausa não falta nas contas - só não
 * aparece como evento na conversa, que é informação interna de quem atende,
 * não do histórico da conversa em si.
 */
const ModalDetalheAtendimento = ({ chatId, onHide }: Props) => {
  const { req } = useApi();

  const [atendimento, setAtendimento] = useState<SupportChatsResponse | null>(null);
  const [carregando, setCarregando] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId) {
      setAtendimento(null);
      return;
    }

    let cancelado = false;

    (async () => {
      try {
        setCarregando(true);
        const { data } = await req.get<SupportChatsResponse>(`/support-chats/${chatId}/messages`);
        if (!cancelado) setAtendimento(data);
      } catch (err) {
        if (!cancelado) {
          CatchAlerta(err, 'Erro ao carregar o atendimento');
          onHide();
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // Abre já na última mensagem - é o que interessa de cara numa conversa
  // finalizada, igual ao chat ao vivo.
  //
  // Um `useEffect` simples não bastava: imagem e player de áudio carregam
  // depois do primeiro paint e aumentam a altura da timeline, deixando o
  // scroll "curto" (parado antes do fim). O `ResizeObserver` observa esse
  // crescimento e rola de novo a cada mudança de altura - cobre tanto a
  // troca de atendimento quanto a mídia que chega atrasada.
  useEffect(() => {
    const el = timelineRef.current;
    if (!el || !atendimento) return;

    const irParaOFim = () => {
      el.scrollTop = el.scrollHeight;
    };

    irParaOFim();

    const observador = new ResizeObserver(irParaOFim);
    observador.observe(el);

    return () => observador.disconnect();
  }, [atendimento]);

  const contato = atendimento?.contact;
  const mensagens = atendimento?.supportChatMessages ?? [];

  // Transferência e chamada continuam relevantes na timeline; pausa/retomada
  // saem de propósito - ver o comentário do componente.
  const eventosRelevantes = (atendimento?.supportChatEvents ?? []).filter(
    (evento) => evento.tipo === 'transferencia' || evento.tipo === 'chamada',
  );

  type ItemDaLinha =
    | { tipo: 'mensagem'; data: string; mensagem: (typeof mensagens)[number] }
    | { tipo: 'evento'; data: string; evento: (typeof eventosRelevantes)[number] };

  const linhaDoTempo: ItemDaLinha[] = [
    ...mensagens.map((mensagem) => ({ tipo: 'mensagem' as const, data: mensagem.datetime, mensagem })),
    ...eventosRelevantes.map((evento) => ({ tipo: 'evento' as const, data: evento.created_at, evento })),
  ].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  const descreveEvento = (evento: (typeof eventosRelevantes)[number]): string => {
    if (evento.tipo === 'chamada') return 'Chamada recebida';

    const origem = evento.userOrigem ? nomeCompleto(evento.userOrigem) : 'Fila';
    // Nulo é "devolvido para a espera", não ausência de dado - ver o tipo.
    const destino = evento.userDestino ? nomeCompleto(evento.userDestino) : 'fila de espera';
    return `Transferido de ${origem} para ${destino}`;
  };

  return (
    <Modal
      header="Atendimento"
      visible={Boolean(chatId)}
      onHide={onHide}
      className="mt-8"
      style={{ width: '75rem', maxWidth: '95vw', height: '50rem' }}
      position="top"
      // A tabela de Histórico por trás é mais alta que a tela; sem isto o
      // body rolava junto por baixo do modal, com os dois scrolls brigando.
      blockScroll
    >
      {carregando || !atendimento ? (
        <div className="flex justify-content-center p-5">
          <ProgressSpinner />
        </div>
      ) : (
        <div className="grid h-full">
          <div className="col-12 md:col-5">
            <h3 className="mt-0 text-lg font-semibold text-primary">Informações do atendimento</h3>

            <div className="flex flex-column gap-3">
              <div className="flex align-items-center gap-2">
                <i className="pi pi-user text-color-secondary" />
                <span>{contato ? nomeCompleto(contato) : atendimento.protocol}</span>
              </div>

              {contato?.phone && (
                <div className="flex align-items-center gap-2">
                  <i className="pi pi-phone text-color-secondary" />
                  <span>{contato.phone}</span>
                </div>
              )}

              <div className="flex align-items-center gap-2">
                <i
                  className="pi pi-exclamation-circle"
                  style={{ color: 'var(--orange-500)' }}
                />
                <span>Cliente chamou em: {dataHoraCompleta(atendimento.created_at)}</span>
              </div>

              <div className="flex align-items-center gap-2">
                <i
                  className="pi pi-question-circle"
                  style={{ color: 'var(--orange-500)' }}
                />
                <span>Atendente respondeu em: {dataHoraCompleta(atendimento.answered_at)}</span>
              </div>

              <div className="flex align-items-center gap-2">
                <i
                  className="pi pi-check-circle"
                  style={{ color: 'var(--green-500)' }}
                />
                <span>Atendente finalizou em: {dataHoraCompleta(atendimento.finished_at)}</span>
              </div>

              {/* Sem `answered_at` ninguém assumiu a conversa - não existe
                  duração de atendimento a mostrar, só o tempo que ela ficou
                  esperando até fechar (bloco seguinte). */}
              {atendimento.finished_at && atendimento.answered_at && (
                <div className="flex align-items-center gap-2">
                  <i
                    className="pi pi-clock"
                    style={{ color: 'var(--green-500)' }}
                  />
                  <span>
                    Duração:{' '}
                    {duracaoCompacta(
                      Math.max(
                        0,
                        Math.floor(
                          (new Date(atendimento.finished_at).getTime() -
                            new Date(atendimento.answered_at).getTime()) /
                            1000,
                        ) - (atendimento.paused_total_seconds ?? 0),
                      ),
                    )}
                  </span>
                </div>
              )}

              {atendimento.finished_at && !atendimento.answered_at && (
                <div className="flex align-items-center gap-2">
                  <i
                    className="pi pi-clock"
                    style={{ color: 'var(--orange-500)' }}
                  />
                  <span>
                    Espera:{' '}
                    {duracaoCompacta(
                      Math.max(
                        0,
                        Math.floor(
                          (new Date(atendimento.finished_at).getTime() -
                            new Date(atendimento.created_at).getTime()) /
                            1000,
                        ),
                      ),
                    )}
                  </span>
                </div>
              )}

              {atendimento.user && (
                <div className="flex align-items-center gap-2">
                  <i
                    className="pi pi-headphones"
                    style={{ color: 'var(--red-400)' }}
                  />
                  <span>{nomeCompleto(atendimento.user)}</span>
                </div>
              )}
            </div>

            <h3 className="text-lg font-semibold text-primary mt-5">Relato do atendente</h3>
            <InputTextarea
              value={atendimento.observation_user ?? ''}
              placeholder="Nenhum relato..."
              disabled
              rows={4}
              autoResize
                className="w-full shadow-3"
                
            />
          </div>

          <div className="col-12 md:col-1 flex justify-content-center h-full">
            <Divider layout="vertical" className="hidden md:flex" />
            <Divider
              layout="horizontal"
              className="flex md:hidden"
            />
          </div>

          <div className="col-12 md:col-6 h-full ">
            <h3 className="mt-0 text-lg font-semibold text-primary">Chat do atendimento</h3>

            <div
              ref={timelineRef}
              className="flex flex-column gap-1 shadow-3 overflow-y-auto p-2 border-1 border-round border-200 surface-50"
              style={{ maxHeight: '38rem' }}
            >
              {linhaDoTempo.length === 0 && (
                <span className="text-color-secondary">Nenhuma mensagem neste atendimento.</span>
              )}

              {linhaDoTempo.map((item) =>
                item.tipo === 'mensagem' ? (
                  <BolhaMensagemHistorico
                    key={item.mensagem.id}
                    message={item.mensagem}
                  />
                ) : (
                  <div
                    key={item.evento.id}
                    className="align-self-center text-xs text-color-secondary surface-200 border-round px-2 py-1 my-1"
                  >
                    {descreveEvento(item.evento)}
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ModalDetalheAtendimento;
