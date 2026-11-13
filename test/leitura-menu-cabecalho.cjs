// Executar em front/: node test/leitura-menu-cabecalho.cjs
const assert = require('node:assert/strict');
const { carregar } = require('./selecao-atendimentos.cjs');
const interfaces = carregar('src/Interfaces/suport-chat.interface.ts');
const { createChatSlice } = carregar('src/store/chatSlice.ts', { '@/Interfaces': interfaces });
const Acoes = carregar('src/app/(main)/chat/[[...id]]/_ChatSection/MessageItem/_Header/AcoesAtendimento.tsx', {
  'primereact/button': { Button: 'Button' }, 'primereact/splitbutton': { SplitButton: 'SplitButton' },
}).default;
let estado, responder;
const chamadas = [], erros = [];
const set = acao => { estado = { ...estado, ...(typeof acao === 'function' ? acao(estado) : acao) }; };
const store = selecionar => selecionar(estado);
store.getState = () => estado;
const deps = {
  react: { useState: valor => [valor, () => {}] }, '@/Interfaces': interfaces,
  '@/service/Api/ApiClient': { default: () => ({ FetchReq: async entrada => { chamadas.push(entrada); return responder(entrada); } }) },
  '@/service/Util': { CatchAlerta: erro => erros.push(erro) },
  '@/hooks/useUsuarioLogado': { useUsuarioLogado: () => ({ usuarioId: 7 }) },
  '@/store/useChatStore': { useChatStore: store },
  '@/store/useSelecaoMensagens': { useSelecaoMensagens: selecionar => selecionar({ entrarModoSelecao() {} }) },
  '@/hooks/usePermissoesModulo': { usePermissoesModulo: () => ({ podeEditar: true, podeAcao: () => true, carregado: true }) },
};
for (const nome of ['ModalContatoChat', 'SidebarDetalhesContato', 'ModalFinalizarAtendimento', 'ModalTransferirAtendimento']) {
  deps['../_components/' + nome] = { default: nome };
}
for (const nome of ['AcoesAtendimento', 'AtendenteAtual', 'BadgeProtocolo', 'Cronometro', 'IdentificacaoContato']) {
  deps['./_Header/' + nome] = { default: nome };
}
const Header = carregar('src/app/(main)/chat/[[...id]]/_ChatSection/MessageItem/Header.tsx', deps).default;
function encontrar(no, tipo) {
  if (Array.isArray(no)) return no.map(n => encontrar(n, tipo)).find(Boolean);
  if (!no?.props) return null;
  return no.type === tipo ? no : encontrar(no.props.children, tipo);
}
const conversa = (id = '1', extras = {}) => ({ id, user_id: 7, support_chat_status_id: 2,
  unread_count: 3, marked_unread: false, contact: { id: 10 }, ...extras });
const preparar = extras => {
  const chat = conversa('1', extras);
  estado = { ...createChatSlice(set), chats: [chat], activeChat: chat };
  chamadas.length = 0; erros.length = 0;
  responder = () => ({ ...chat, marked_unread: true });
};
const opcao = () => {
  const props = encontrar(Header(), 'AcoesAtendimento').props;
  return encontrar(Acoes(props), 'SplitButton').props.model.find(item => item.label?.startsWith('Marcar como'));
};
(async () => {
  preparar();
  assert.equal(opcao().label, 'Marcar como lida');
  await opcao().command();
  assert.equal(chamadas[0].endpoint, 'MarcarConversaLida');
  assert.equal(estado.activeChat.unread_count, 0);
  assert.equal(estado.chats[0].unread_count, 0);
  assert.equal(estado.activeChat.marked_unread, false);
  assert.equal(opcao().label, 'Marcar como não lida');
  await opcao().command();
  assert.equal(chamadas[1].endpoint, 'MarcarConversaNaoLida');
  assert.equal(opcao().label, 'Marcar como lida');

  preparar({ unread_count: 0, marked_unread: true });
  assert.equal(opcao().label, 'Marcar como lida', 'Marca manual conta como não lida');
  preparar({ unread_count: 0, marked_unread: false });
  estado.setUnreadCount(1, 2);
  assert.equal(opcao().label, 'Marcar como lida', 'Novo contador atualiza o menu da conversa aberta');
  estado.setUnreadCount('1', 0);
  assert.equal(opcao().label, 'Marcar como não lida');
  preparar();
  const antes = estado.activeChat;
  responder = () => { throw new Error('Falha controlada'); };
  await opcao().command();
  assert.equal(estado.activeChat, antes);
  assert.equal(erros.length, 1);

  preparar();
  responder = () => {
    estado.chats = [conversa('1', { user_id: 9, paused_at: 'pausa' })];
    estado.activeChat = conversa('2', { unread_count: 5 });
    return {};
  };
  await opcao().command();
  assert.equal(estado.activeChat.id, '2', 'Retorno não afeta outra conversa aberta');
  assert.equal(estado.activeChat.unread_count, 5);
  assert.equal(estado.chats[0].user_id, 9);
  assert.equal(estado.chats[0].paused_at, 'pausa');
  assert.equal(estado.chats[0].unread_count, 0);
  console.log('Menu do cabeçalho: leitura, marca manual, ação inversa, falha e troca concorrente de conversa validadas.');
})().catch(erro => { console.error(erro); process.exitCode = 1; });
