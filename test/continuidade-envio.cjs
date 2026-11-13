// Executar em front/: node test/continuidade-envio.cjs
const assert = require('node:assert/strict');
const { createStore } = require('zustand/vanilla');
const { carregar } = require('./selecao-atendimentos.cjs');
const interfaces = carregar('src/Interfaces/suport-chat.interface.ts');
const { createMessageSlice } = carregar('src/store/messageSlice.ts');

function preparar() {
  const armazenamento = new Map();
  global.localStorage = { getItem: nome => armazenamento.get(nome) ?? null,
    setItem: (nome, valor) => armazenamento.set(nome, valor), removeItem: nome => armazenamento.delete(nome) };
  const { useOutboxStore: fila } = carregar('src/store/useOutboxStore.ts');
  const chat = createStore(set => ({ ...createMessageSlice(set), activeChat: { id: '10' } }));
  const conciliacao = carregar('src/service/Outbox/conciliacao.ts');
  const processador = carregar('src/service/Outbox/index.ts', {
    '@/store/useOutboxStore': { useOutboxStore: fila },
    '@/store/useChatStore': { useChatStore: chat },
    './conciliacao': conciliacao,
    './jaAnimadas': { marcaComoAnimada() {} },
  });
  const visiveis = () => conciliacao.conciliarMensagens(chat.getState().messages, fila.getState().itens, '10');
  return { fila, chat, conciliacao, processador, visiveis };
}

const item = (id, extras = {}) => ({ id, supportChatId: '10', chatId: 'contato@c.us',
  enviadoEm: '2026-11-12T15:00:00.000Z', tipo: 'texto', conteudo: 'Teste', autor: 'Douglas', ...extras });
const tick = () => new Promise(resolve => setImmediate(resolve));
async function aguardar(condicao) {
  for (let n = 0; n < 30; n++) { if (condicao()) return; await tick(); }
  assert.fail('Envio não concluiu no cenário controlado');
}

(async () => {
  try {
    for (const extras of [{}, { quotedMessageId: 'citada' },
      { tipo: 'midia', mediaType: 'image', mimetype: 'image/png', previewUrl: 'blob:imagem', mediaKey: 'imagem' },
      { tipo: 'midia', mediaType: 'video', mimetype: 'video/mp4', previewUrl: 'blob:video', mediaKey: 'video' },
      { tipo: 'voz', mimetype: 'audio/ogg', previewUrl: 'blob:voz', mediaKey: 'voz' },
      { tipo: 'midia', mediaType: 'document', fileName: 'teste.pdf', mediaKey: 'pdf' }]) {
      const t = preparar();
      const envio = item('local', extras);
      t.fila.getState().enfileirar(envio);
      const antes = t.visiveis()[0];
      const quantidades = [];
      t.fila.subscribe(() => quantidades.push(t.visiveis().length));
      t.chat.subscribe(() => quantidades.push(t.visiveis().length));
      let resolver;
      let chamadas = 0;
      t.processador.processarItem(t.fila.getState().itens[0], async requisicao => {
        chamadas++;
        assert.equal(requisicao.endpoint, extras.tipo ? 'SendMedia' : extras.quotedMessageId ? 'SendReply' : 'SendMessage');
        return new Promise(resolve => { resolver = resolve; });
      });
      await aguardar(() => !!resolver);
      assert.equal(t.visiveis()[0].pending, true);
      resolver({ status: 'message sent', message_id: 'WA-10' });
      await aguardar(() => !t.fila.getState().itens.length);
      assert.ok(quantidades.every(n => n === 1), `A bolha sumiu/duplicou: ${quantidades}`);
      let depois = t.visiveis()[0];
      assert.equal(depois.id, antes.id);
      assert.equal(depois.media_url, antes.media_url);
      assert.equal(depois.pending, false);
      assert.equal(depois.progresso, undefined);
      assert.equal(depois.message_id, 'WA-10');
      assert.equal(chamadas, 1);

      // Webhook/ack atrasado atualiza os dados, preservando a instância e a mídia local.
      t.chat.getState().updateMessage({ ...depois, id: '900', ack: 3,
        media_url: extras.tipo ? 'https://storage/arquivo' : '', is_edited: true });
      depois = t.visiveis()[0];
      assert.equal(depois.id, antes.id);
      assert.equal(depois.media_url, extras.previewUrl ?? (extras.tipo ? 'https://storage/arquivo' : ''));
      assert.equal(depois.ack, 3);
      assert.equal(depois.is_edited, true);
      assert.equal(t.visiveis().length, 1);

      if (extras.tipo) {
        t.chat.getState().updateMessage({ ...t.chat.getState().messages[0], media_expired: true, media_url: '' });
        assert.equal(t.visiveis()[0].media_url, '', 'Prévia não pode burlar retenção de mídia');
      }
      t.conciliacao.liberarPreviasConfirmadas('10');
    }

    // O socket também pode chegar antes do HTTP. O resultado confirmado é único
    // e preserva o ack real, em vez de voltar para zero com a resposta HTTP.
    const adiantada = preparar();
    adiantada.fila.getState().enfileirar(item('local-antes'));
    adiantada.processador.processarItem(adiantada.fila.getState().itens[0], async () => {
      adiantada.chat.getState().updateMessage({ ...adiantada.conciliacao.mensagemDaFila(item('outro')),
        id: '901', message_id: 'WA-ANTES', pending: false, ack: 3 });
      return { message_id: 'WA-ANTES' };
    });
    await aguardar(() => !adiantada.fila.getState().itens.length);
    assert.equal(adiantada.visiveis().length, 1);
    assert.equal(adiantada.visiveis()[0].id, 'local-antes');
    assert.equal(adiantada.visiveis()[0].ack, 3);

    // Textos iguais são mensagens diferentes: concilia pelo id, nunca pelo conteúdo.
    const iguais = preparar();
    let numero = 0;
    for (const id of ['igual-1', 'igual-2']) {
      iguais.fila.getState().enfileirar(item(id));
      iguais.processador.processarItem(iguais.fila.getState().itens.find(i => i.id === id), async () => ({ message_id: `WA-${++numero}` }));
    }
    await aguardar(() => !iguais.fila.getState().itens.length);
    assert.equal(iguais.visiveis().length, 2);
    assert.equal(new Set(iguais.visiveis().map(m => m.id)).size, 2);

    // O envio termina em outra conversa sem inserir a mensagem no chat errado.
    const outra = preparar();
    outra.fila.getState().enfileirar(item('local-outra'));
    outra.processador.processarItem(outra.fila.getState().itens[0], async () => {
      outra.chat.setState({ activeChat: { id: '20' } });
      return { message_id: 'WA-OUTRA' };
    });
    await aguardar(() => !outra.fila.getState().itens.length);
    assert.equal(outra.chat.getState().messages.length, 0);

    // Falha real continua na fila e não se torna uma confirmação falsa.
    const falha = preparar();
    falha.fila.getState().enfileirar(item('local-falha'));
    falha.fila.getState().atualizar('local-falha', { tentativas: 2 });
    falha.processador.processarItem(falha.fila.getState().itens[0], async () => { throw new Error('Falha simulada'); });
    await aguardar(() => falha.fila.getState().itens[0]?.status === 'falhou');
    assert.equal(falha.visiveis().length, 1);
    assert.equal(falha.chat.getState().messages.length, 0);
    console.log('Continuidade validada: texto, citação, imagem, vídeo, voz, documento, ack antes/depois, textos iguais, troca de chat e falhas. Sem envio real.');
  } finally {
    delete global.localStorage;
  }
})().catch(erro => { console.error(erro); process.exitCode = 1; });
