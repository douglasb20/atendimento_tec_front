'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { QuickReplyResponse, SupportChatsResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { Mask } from '@/service/Util';

/**
 * As respostas rápidas disponíveis e a resolução das variáveis.
 *
 * ⚠️ **As variáveis são resolvidas aqui, no front, na hora de inserir** - e não
 * no backend, como acontece nas mensagens automáticas do canal. O motivo é o
 * fluxo: a resposta rápida entra na caixa de mensagem para o atendente revisar
 * antes de enviar, e o `sendMessage` normal não passa pelo substituidor. Sem
 * isto ele veria `{{nome}}` cru e mandaria assim.
 *
 * ⚠️ A lista de chaves precisa casar com `components/EditorMensagem/variaveis.ts`
 * (que é o que a tela de cadastro oferece) e com
 * `back/src/support-chats/mensagens-automaticas.ts`.
 */

/** "Bom dia" / "Boa tarde" / "Boa noite" pelo horário local. */
const saudacaoDoHorario = (): string => {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
};

/** Junta nome e sobrenome, pulando o que estiver vazio. */
const juntaNome = (nome?: string | null, sobrenome?: string | null): string =>
  [nome, sobrenome].filter(Boolean).join(' ').trim();

/** Os valores reais da conversa aberta. */
const valoresDaConversa = (chat?: SupportChatsResponse | null): Record<string, string> => ({
  saudacao: saudacaoDoHorario(),

  // ⚠️ `{{nome}}` é o primeiro nome desde a separação das colunas.
  nome: chat?.contact?.name ?? '',
  sobrenome: chat?.contact?.last_name ?? '',
  nome_completo: juntaNome(chat?.contact?.name, chat?.contact?.last_name),

  telefone: chat?.contact?.phone ? Mask(chat.contact.phone, '(##) # ####-####') : '',
  protocolo: chat?.protocol ?? '',
  cliente: chat?.contact?.client?.nome ?? '',
  cnpj: chat?.contact?.client?.cnpj ? Mask(chat.contact.client.cnpj, '##.###.###/####-##') : '',

  // Aqui o atendente é sempre o dono da conversa: a resposta rápida só é
  // inserida por quem já assumiu o atendimento.
  atendente: chat?.user?.name ?? '',
  atendente_sobrenome: chat?.user?.last_name ?? '',
  atendente_nome_completo: juntaNome(chat?.user?.name, chat?.user?.last_name),

  // ⚠️ `{{canal}}` sai vazio aqui: o payload do chat traz `channel_id`, não a
  // relação. Resolver isso exigiria carregar o canal na rota da conversa - e
  // como a variável é pouco útil numa resposta pronta (quem atende sabe em que
  // canal está), fica vazia em vez de puxar dado só para ela.
  canal: '',
});

/** Marcador `{{ chave }}`, tolerando espaços em volta. */
const MARCADOR = /\{\{\s*([a-z_]+)\s*\}\}/gi;

export const useRespostasRapidas = (chat?: SupportChatsResponse | null) => {
  const { FetchReq } = useApi();
  const [respostas, setRespostas] = useState<QuickReplyResponse[]>([]);
  const [carregado, setCarregado] = useState(false);

  /**
   * Relê a lista do servidor.
   *
   * Exposto porque o chat cadastra resposta nova pelo rodapé da lista
   * flutuante: sem recarregar, a recém-criada só apareceria no próximo F5.
   */
  const recarregar = useCallback(async () => {
    try {
      const lista = await FetchReq<QuickReplyResponse[]>('ListarRespostasRapidas');
      setRespostas(lista ?? []);
    } catch {
      // Sem respostas rápidas o chat funciona igual: é atalho, não requisito.
      // Alertar aqui interromperia quem só quer digitar.
    } finally {
      setCarregado(true);
    }
    // `FetchReq` nasce a cada render do hook e invalidaria este callback (e o
    // efeito abaixo) a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Uma vez por montagem do chat: a lista muda pouco e é pequena. Buscar a cada
  // `/` digitado faria uma requisição por tecla.
  useEffect(() => {
    recarregar();
  }, [recarregar]);

  /**
   * Troca as variáveis pelos valores da conversa.
   *
   * Tolerante: chave desconhecida ou valor ausente vira string vazia. Uma
   * resposta com `{{cliente}}` num contato sem cliente deve sair sem o nome,
   * não com o marcador cru na cara do cliente.
   */
  const resolveVariaveis = useCallback(
    (texto: string): string => {
      const valores = valoresDaConversa(chat);

      return texto.replace(MARCADOR, (_, chave: string) => valores[chave.toLowerCase()] ?? '');
    },
    [chat],
  );

  /** As que casam com o termo digitado depois da barra. */
  const filtrar = useCallback(
    (termo: string): QuickReplyResponse[] => {
      const busca = termo.trim().toLowerCase();

      if (!busca) return respostas;

      // Atalho primeiro, mensagem depois: quem digita `/bol` quer `/boleto`,
      // não uma resposta que menciona "boleto" no meio do texto.
      const porAtalho = respostas.filter((r) => r.atalho.toLowerCase().includes(busca));
      const porMensagem = respostas.filter(
        (r) => !r.atalho.toLowerCase().includes(busca) && r.mensagem.toLowerCase().includes(busca),
      );

      return [...porAtalho, ...porMensagem];
    },
    [respostas],
  );

  return useMemo(
    () => ({ respostas, carregado, filtrar, resolveVariaveis, recarregar }),
    [respostas, carregado, filtrar, resolveVariaveis, recarregar],
  );
};
