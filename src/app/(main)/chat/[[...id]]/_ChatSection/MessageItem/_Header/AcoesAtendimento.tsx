'use client';

import { Button } from 'primereact/button';
import { MenuItem } from 'primereact/menuitem';
import { SplitButton } from 'primereact/splitbutton';

type AcoesAtendimentoProps = {
  aguardando: boolean;
  emAndamento: boolean;
  /** Se a conversa é deste atendente. Alheia é só leitura. */
  souODono: boolean;
  finalizado: boolean;
  processando: boolean;
  onIniciar: () => void;
  onFinalizar: () => void;
  /** Encerra sem enviar a despedida do canal. */
  onFinalizarSemDespedida: () => void;
  /** Encerra de Aguardando, sem que tenha havido atendimento. */
  onFinalizarSemAtendimento: () => void;
  onMarcarNaoLida: () => void;
  onSelecionarMensagens: () => void;
  onEditarContato: () => void;
  onTransferir: () => void;
};

/**
 * Ações do atendimento, que mudam conforme o estado.
 *
 * Aguardando mostra só "Iniciar": cadastrar contato ou finalizar antes de
 * alguém assumir não faz sentido - não há atendimento em curso.
 */
const AcoesAtendimento = ({
  aguardando,
  emAndamento,
  souODono,
  finalizado,
  processando,
  onIniciar,
  onFinalizar,
  onFinalizarSemDespedida,
  onFinalizarSemAtendimento,
  onMarcarNaoLida,
  onSelecionarMensagens,
  onEditarContato,
  onTransferir,
}: AcoesAtendimentoProps) => {

  /**
   * Tudo o que não é "finalizar agora", atrás da seta.
   *
   * Um menu só, e não dois: a seta do split e um botão de três pontos ao lado
   * ofereciam a mesma coisa - uma lista de ações - e obrigavam a abrir os dois
   * para saber o que havia em cada um.
   *
   * O separador divide o que encerra do que não encerra: a variação de
   * finalização fica junto do botão a que pertence, e abaixo dela as ações que
   * mantêm a conversa aberta.
   */
  const itensAcoes: MenuItem[] = [
    {
      label: 'Finalizar sem despedida',
      icon: 'fa-regular fa-circle-check',
      command: onFinalizarSemDespedida,
    },
    { separator: true },
    {
      label: 'Marcar como não lida',
      icon: 'fa-regular fa-envelope',
      command: onMarcarNaoLida,
    },
    {
      label: 'Selecionar mensagens',
      icon: 'fa-regular fa-list-check',
      command: onSelecionarMensagens,
    },
    {
      label: 'Dados do contato',
      icon: 'fa-regular fa-user-pen',
      command: onEditarContato,
    },
    {
      label: 'Transferir',
      icon: 'fa-regular fa-right-left',
      command: onTransferir,
    },
  ];

  if (finalizado) {
    return (
      <span className="flex align-items-center gap-2 flex-none text-sm font-medium text-green-700 white-space-nowrap">
        <i className="fa-regular fa-circle-check" />
        Finalizado
      </span>
    );
  }

  return (
    <div className="flex align-items-center gap-2 flex-none">
      {aguardando && (
        <>
          <Button
            label="Iniciar atendimento"
            icon="fa-regular fa-play"
            onClick={onIniciar}
            loading={processando}
          />

          {/* Para o que não será atendido: marketing chegando no número, ou
              engano. Encerra sem exigir cliente e sem mandar despedida - o
              texto confirmaria ao remetente que o número é lido. */}
          <Button
            label="Finalizar sem atendimento"
            icon="fa-regular fa-ban"
            severity="secondary"
            outlined
            onClick={onFinalizarSemAtendimento}
            disabled={processando}
          />
        </>
      )}

      {/* Em andamento com outro atendente: nenhuma ação, só o indicativo de
          que a conversa está sendo acompanhada. O nome de quem atende já
          aparece à esquerda, no bloco de metadados. */}
      {emAndamento && !souODono && (
        <span className="flex align-items-center gap-2 flex-none text-sm font-medium text-600 white-space-nowrap">
          <i className="fa-regular fa-eye" />
          Somente leitura
        </span>
      )}

      {/* O clique no corpo finaliza enviando a despedida do canal; a seta abre
          todo o resto. A ação mais comum fica em evidência, e há um gatilho só
          para as demais. */}
      {emAndamento && souODono && (
        <SplitButton
          label="Finalizar"
          icon="fa-regular fa-check"
          severity="success"
          outlined
          onClick={onFinalizar}
          model={itensAcoes}
          // Largura pelo item mais longo: o menu herda a medida do gatilho, e
          // "Finalizar sem despedida" quebrava em duas linhas.
          menuStyle={{ width: 'auto' }}
          pt={{ menuLabel: { className: 'white-space-nowrap' } }}
        />
      )}
    </div>
  );
};

export default AcoesAtendimento;
