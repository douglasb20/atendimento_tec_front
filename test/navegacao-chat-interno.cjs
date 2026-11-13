// Executar em front/: node test/navegacao-chat-interno.cjs
const assert = require('node:assert/strict');
const { preparar, carregar } = require('./selecao-atendimentos.cjs');

function criarStoreInterno(useChatStore) {
  return carregar('src/store/useChatInternoStore.ts', {
    './useChatStore': { useChatStore },
  }).useChatInternoStore;
}

const chat = id => ({ id: String(id), protocol: `PROTOCOLO-${id}`, channel_id: 10,
  support_chat_status_id: 2, user_id: 7, contact: { name: `Contato ${id}` }, unread_count: 0 });

(async () => {
  let url = '/chat/61';
  global.window = {
    location: { get pathname() { return url; } },
    history: { replaceState: (_estado, _titulo, caminho) => { url = caminho; } },
    localStorage: { getItem: () => null }, addEventListener() {}, removeEventListener() {},
  };
  global.document = { querySelector: () => null };
  try {
    const lista = preparar([chat(61), chat(62)], { lista: true, criarStoreInterno });
    await lista.estabilizar();
    const interno = () => lista.interno.getState();
    const colega = { id: 8, name: 'Técnico' };
    lista.estado().addMessages([{ message_id: 'mensagem-do-cliente' }]);
    lista.estado().setQuotedMessage('quote', { message_id: 'mensagem-do-cliente' });

    // A troca de aba libera atendimento, URL e mensagens, sem exigir botão Fechar.
    interno().setAba('interno');
    assert.equal(lista.estado().activeChat, null);
    assert.equal(url, '/chat');
    assert.deepEqual(lista.estado().messages, []);
    assert.equal(lista.estado().quoted.message, null);
    interno().abrirCom(colega);
    assert.equal(interno().ativo.id, 8);
    assert.equal(interno().aba, 'interno');
    interno().setMensagens([{ id: 1 }]);
    interno().setAba('atendimentos');
    assert.equal(interno().ativo, null);
    assert.deepEqual(interno().mensagens, []);
    await lista.estabilizar();

    // Clique real no mesmo atendimento anterior: deve carregar e abrir novamente.
    const cartao = id => lista.elementos().find(no => no.type === 'li' && no.key === String(id));
    cartao(61).props.onClick();
    await lista.estabilizar();
    assert.equal(lista.estado().activeChat.id, '61');
    assert.equal(url, '/chat/61');
    assert.equal(lista.chamadas.filter(c => c.endpoint === 'ListarMensagensPorAtendimentoId').length, 1);

    // Popup permite conversar com colega mantendo o atendimento e sua URL.
    interno().destacar(colega);
    interno().setAba('interno');
    interno().abrirCom({ id: 9, name: 'Outro técnico' });
    assert.equal(lista.estado().activeChat.id, '61');
    assert.equal(url, '/chat/61');
    assert.equal(interno().modo, 'popup');
    interno().setAba('atendimentos');
    assert.equal(interno().ativo.id, 9);
    await lista.estabilizar();
    cartao(61).props.onClick();
    await lista.estabilizar();
    assert.equal(interno().modo, 'popup');
    assert.equal(lista.chamadas.length, 1, 'Atendimento já aberto não precisa recarregar');

    // Encaixar volta ao painel interno e libera o atendimento.
    interno().encaixar();
    assert.equal(interno().aba, 'interno');
    assert.equal(lista.estado().activeChat, null);
    assert.equal(url, '/chat');
    interno().fechar();
    assert.equal(interno().aba, 'atendimentos');
    assert.equal(interno().ativo, null);

    // Notificação/atalho que abre diretamente o colega também libera o painel.
    lista.estado().setActiveChat(chat(61));
    interno().abrirCom(colega);
    assert.equal(lista.estado().activeChat, null);
    assert.equal(interno().aba, 'interno');

    // Um GET antigo não pode reabrir o cliente após entrar e sair do interno.
    let resolver;
    const pendente = new Promise(resolve => { resolver = resolve; });
    const lenta = preparar([chat(61), chat(62)], {
      lista: true, criarStoreInterno, carregarConversa: () => pendente,
    });
    await lenta.estabilizar();
    lenta.elementos().find(no => no.type === 'li' && no.key === '62').props.onClick();
    assert.equal(lenta.estado().loadMessages, true);
    lenta.interno.getState().setAba('interno');
    lenta.interno.getState().abrirCom(colega);
    lenta.interno.getState().setAba('atendimentos');
    assert.equal(lenta.estado().loadMessages, false);
    resolver({ ...chat(62), supportChatMessages: [{ message_id: 'resposta-atrasada' }] });
    await lenta.estabilizar();
    assert.equal(lenta.estado().activeChat, null);
    assert.deepEqual(lenta.estado().messages, []);
    assert.equal(url, '/chat');

    // O popup existe fora do chat: encaixar não deve reescrever a rota atual.
    url = '/clientes';
    interno().destacar(colega);
    interno().encaixar();
    assert.equal(url, '/clientes');

    console.log('Navegação validada: abas, URL, reabertura do mesmo atendimento, atalhos, popup, encaixe e resposta atrasada. Sem rede real.');
  } finally {
    delete global.window;
    delete global.document;
  }
})().catch(erro => { console.error(erro); process.exitCode = 1; });
