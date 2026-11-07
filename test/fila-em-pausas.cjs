// Executar na pasta front: node test/fila-em-pausas.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function carregar(caminho, dependencias = {}) {
  const modulo = { exports: {} };
  const compilado = ts.transpileModule(fs.readFileSync(caminho, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }, fileName: caminho,
  });
  new Function('require', 'exports', compilado.outputText)(nome => dependencias[nome] ?? require(nome), modulo.exports);
  return modulo.exports;
}

const interfaces = carregar('src/Interfaces/suport-chat.interface.ts');
let chatbotHabilitado = true;
const filtros = carregar('src/app/(main)/chat/[[...id]]/_ChatSection/Conversation/FiltroAtendimentos.tsx', {
  '@/Interfaces': interfaces,
  '@/hooks/useAjustesAtendimento': { useAjustesAtendimento: () => ({ ajustes: { chatbot_habilitado: chatbotHabilitado } }) },
  'primereact/button': { Button: 'button' },
  'primereact/utils': { classNames: () => '' },
});
const { grupoDaConversa, filtraPorGrupo } = filtros;
const conversa = (id, status, extras = {}) => ({ id: String(id), support_chat_status_id: status, user_id: 7, paused_at: null, ...extras });
const pausa = '2026-11-06T10:00:00.000Z';
const chats = [conversa(1, 2), conversa(2, 2, { paused_at: pausa }), conversa(3, 1),
  conversa(4, 3), conversa(5, 5, { pos_atendimento_ativo: true, paused_at: pausa })];

assert.deepEqual(chats.map(grupoDaConversa), ['andamento', 'pausas', 'fila', 'chatbot', 'chatbot']);
assert.deepEqual(filtraPorGrupo(chats, 'andamento').map(c => c.id), ['1']);
assert.deepEqual(filtraPorGrupo(chats, 'pausas').map(c => c.id), ['2']);
assert.equal(filtraPorGrupo(chats, 'todos').length, 5);
assert.equal(grupoDaConversa(conversa(6, 1, { paused_at: pausa })), 'fila');
assert.equal(grupoDaConversa(conversa(7, 2, { paused_at: undefined })), 'andamento');

let selecionado = 'andamento';
const botoes = () => filtros.default({ chats, grupoAtivo: selecionado, onSelecionar: grupo => { selecionado = grupo; } }).props.children;
const botaoPausas = botoes().find(botao => botao.props.tooltip === 'Em pausas');
assert.ok(botaoPausas);
assert.equal(botaoPausas.props['aria-label'], 'Em pausas: 1');
assert.equal(botoes().find(botao => botao.props.tooltip === 'Em atendimento').props['aria-label'], 'Em atendimento: 1');
botaoPausas.props.onClick();
assert.equal(selecionado, 'pausas');
assert.equal(botoes().find(botao => botao.props.tooltip === 'Em pausas').props['aria-pressed'], true);
chatbotHabilitado = false;
assert.ok(botoes().some(botao => botao.props.tooltip === 'Em pausas'));
assert.ok(!botoes().some(botao => botao.props.tooltip === 'Chatbot'));

// Store real: resposta da ação e payloads do socket movem a conversa entre grupos.
const { createChatSlice } = carregar('src/store/chatSlice.ts', { '@/Interfaces': interfaces });
let estado;
const acoes = createChatSlice(acao => { estado = { ...estado, ...(typeof acao === 'function' ? acao(estado) : acao) }; });
const aberta = conversa(20, 2);
estado = { ...acoes, chats: [aberta], activeChat: aberta };
acoes.patchActiveChat({ paused_at: pausa });
assert.equal(filtraPorGrupo(estado.chats, 'andamento').length, 0);
assert.equal(filtraPorGrupo(estado.chats, 'pausas').length, 1);
assert.equal(estado.activeChat.id, '20');
assert.equal(estado.activeChat.user_id, 7);
acoes.updateChat(conversa(20, 2)); // Eco antigo não deve desfazer a pausa local.
assert.equal(filtraPorGrupo(estado.chats, 'pausas').length, 1);
acoes.patchActiveChat({ paused_at: null });
assert.equal(filtraPorGrupo(estado.chats, 'pausas').length, 0);
assert.equal(filtraPorGrupo(estado.chats, 'andamento').length, 1);

estado = { ...acoes, chats: [conversa(21, 2)], activeChat: null };
acoes.updateChat(conversa(21, 2, { paused_at: pausa }));
assert.equal(filtraPorGrupo(estado.chats, 'pausas').length, 1);
acoes.updateChat(conversa(21, 2));
assert.equal(filtraPorGrupo(estado.chats, 'andamento').length, 1);
acoes.updateChat(conversa(21, 5));
assert.equal(estado.chats.length, 0);

console.log('Fila Em pausas: separação, contadores, seleção, chatbot desabilitado, pausa/retomada local e remota, eco atrasado e finalização validados.');
