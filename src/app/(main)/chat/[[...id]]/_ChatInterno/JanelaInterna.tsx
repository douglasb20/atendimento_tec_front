'use client';

import { useEffect, useMemo, useRef } from 'react';
import { ProgressSpinner } from 'primereact/progressspinner';

import Avatar from '@/components/Avatar';
import { useUsuarioLogado } from '@/hooks/useUsuarioLogado';
import { ColegaResponse } from '@/Interfaces';
import { useChatInternoStore } from '@/store/useChatInternoStore';
import BolinhaPresenca from './BolinhaPresenca';
import CaixaEnvioInterna from './CaixaEnvioInterna';
import MensagemInterna from './MensagemInterna';
import { useEnvioInterno } from './useEnvioInterno';

const nomeDe = (colega: ColegaResponse) =>
  [colega.name, colega.last_name].filter(Boolean).join(' ');

/** O texto ao lado do nome, no cabeçalho. */
const ROTULO: Record<string, string> = {
  online: 'Disponível',
  ausente: 'Ausente',
  offline: 'Offline',
};

/** `22/09/2026` → `Hoje`, `Ontem` ou a data. */
const rotuloDoDia = (iso: string) => {
  const data = new Date(iso);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);

  if (data.toDateString() === hoje.toDateString()) return 'Hoje';
  if (data.toDateString() === ontem.toDateString()) return 'Ontem';

  return data.toLocaleDateString('pt-BR');
};

type Props = {
  /** Cabeçalho próprio (o popup traz o seu, com os controles de janela). */
  semCabecalho?: boolean;
};

/**
 * A conversa aberta: mensagens e caixa de envio.
 *
 * Serve tanto o painel dentro de `/chat` quanto o popup flutuante - o que muda
 * entre os dois é só o cabeçalho.
 */
const JanelaInterna = ({ semCabecalho = false }: Props) => {
  const ativo = useChatInternoStore((s) => s.ativo);
  const mensagens = useChatInternoStore((s) => s.mensagens);
  const carregando = useChatInternoStore((s) => s.carregandoMensagens);
  const presencas = useChatInternoStore((s) => s.presencas);

  const { usuarioId } = useUsuarioLogado();
  const { enviarTexto, enviarArquivo, enviarAudio } = useEnvioInterno();

  const fimRef = useRef<HTMLDivElement>(null);

  // Mensagem nova rola para o fim. O backend devolve da mais recente para a
  // mais antiga; a tela inverte para ler de cima para baixo.
  const emOrdem = useMemo(() => [...mensagens].reverse(), [mensagens]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [emOrdem.length]);

  if (!ativo) {
    return (
      <div className="flex-1 flex align-items-center justify-content-center text-500 text-sm p-4">
        Escolha um colega para conversar.
      </div>
    );
  }

  return (
    <div className="flex flex-column h-full">
      {!semCabecalho && (
        <div className="flex align-items-center gap-2 p-2 border-bottom-1 surface-border surface-50">
          <div className="relative flex-shrink-0">
            <Avatar
              src={ativo.avatar_url}
              alt={nomeDe(ativo)}
              width={32}
              height={32}
              className="border-circle"
              style={{ objectFit: 'cover' }}
            />
            <BolinhaPresenca
              estado={presencas[ativo.id] ?? 'offline'}
              tamanho={0.6}
            />
          </div>

          <div className="flex flex-column min-w-0">
            <span className="font-medium text-sm white-space-nowrap overflow-hidden text-overflow-ellipsis">
              {nomeDe(ativo)}
            </span>
            <span className="text-xs text-500">{ROTULO[presencas[ativo.id] ?? 'offline']}</span>
          </div>
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto p-2"
        style={{ minHeight: 0 }}
      >
        {carregando && (
          <div className="flex justify-content-center p-4">
            <ProgressSpinner style={{ width: '2rem', height: '2rem' }} />
          </div>
        )}

        {!carregando && !emOrdem.length && (
          <p className="text-center text-500 text-sm p-4">
            Nenhuma mensagem ainda. Escreva a primeira.
          </p>
        )}

        {emOrdem.map((mensagem, indice) => {
          // Separador de data só quando o dia muda.
          const anterior = emOrdem[indice - 1];
          const mudouODia =
            !anterior ||
            new Date(anterior.created_at).toDateString() !==
              new Date(mensagem.created_at).toDateString();

          return (
            <div key={mensagem.id}>
              {mudouODia && (
                <div className="flex justify-content-center my-2">
                  <span className="surface-200 text-600 text-xs px-2 py-1 border-round-2xl">
                    {rotuloDoDia(mensagem.created_at)}
                  </span>
                </div>
              )}

              <MensagemInterna
                mensagem={mensagem}
                propria={mensagem.sender_id === usuarioId}
              />
            </div>
          );
        })}

        <div ref={fimRef} />
      </div>

      <CaixaEnvioInterna
        onEnviarTexto={(texto) => enviarTexto(ativo.id, texto)}
        onEnviarArquivo={(item) => enviarArquivo(ativo.id, item)}
        onEnviarAudio={(arquivo) => enviarAudio(ativo.id, arquivo)}
      />
    </div>
  );
};

export default JanelaInterna;
