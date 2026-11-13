// Executar em front/: node test/avatar-conversas.cjs
const assert = require('node:assert/strict');
const { carregar } = require('./selecao-atendimentos.cjs');
const interfaces = carregar('src/Interfaces/suport-chat.interface.ts');
const { createChatSlice } = carregar('src/store/chatSlice.ts', { '@/Interfaces': interfaces });
let estado;
const set = acao => { estado = { ...estado, ...acao(estado) }; };
const conversa = (id, usuario, avatar) => ({ id, user_id: usuario,
  user: { id: usuario, name: 'Antes', avatar_url: avatar, role: 'atendente' },
  unread_count: 4, support_chat_status_id: 2, paused_at: 'pausa', contact: { id: 10 } });
const primeira = conversa('1', '7', 'antigo.png');
const outra = conversa('2', 8, 'outro.png');
const ativa = conversa('3', 7, null);
estado = { ...createChatSlice(set), chats: [primeira, outra], activeChat: ativa };
estado.atualizarPerfilNasConversas({ id: 7, name: 'Novo nome', last_name: 'Sobrenome', avatar_url: 'novo.png' });
assert.equal(estado.activeChat.user.avatar_url, 'novo.png');
assert.equal(estado.chats[0].user.avatar_url, 'novo.png');
assert.equal(estado.chats[0].user.name, 'Novo nome');
assert.equal(estado.chats[1], outra);
assert.equal(estado.activeChat.user.role, 'atendente');
for (const campo of ['user_id', 'unread_count', 'support_chat_status_id', 'paused_at', 'contact']) {
  assert.equal(estado.activeChat[campo], ativa[campo]);
}
assert.equal(primeira.user.avatar_url, 'antigo.png');
estado.atualizarPerfilNasConversas({ id: 7, name: 'Novo nome', avatar_url: null });
assert.equal(estado.activeChat.user.avatar_url, null);
assert.equal(estado.chats[0].user.avatar_url, null);
estado.activeChat = null;
estado.atualizarPerfilNasConversas({ id: 7, name: 'Novo nome', avatar_url: 'terceiro.png' });
assert.equal(estado.activeChat, null);
assert.equal(estado.chats[0].user.avatar_url, 'terceiro.png');
console.log('Avatar nas conversas: troca, primeira foto, remoção, IDs mistos e preservação do atendimento.');
