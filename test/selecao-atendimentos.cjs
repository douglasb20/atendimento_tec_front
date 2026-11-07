// Executar na pasta front: node test/selecao-atendimentos.cjs
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
const lote = carregar('src/service/AcoesAtendimentosEmLote.ts', { '@/Interfaces': interfaces });
const chat = (id, extras = {}) => ({ id: String(id), protocol: `PROTOCOLO-${id}`, channel_id: 10,
  channel: { id: 10, name: 'Canal A' }, support_chat_status_id: 2, user_id: 7, paused_at: null,
  unread_count: 3, marked_unread: true, contact: { name: `Contato ${id}`, client_id: 1 }, ...extras });
const obrigatorio = { id: 100, name: 'Saída A', executar_por_padrao: true, pode_alterar: false };
const opcional = { id: 200, name: 'Saída B', executar_por_padrao: false, pode_alterar: true };

/** Executa os handlers reais do componente com hooks controlados, sem rede ou DOM. */
function preparar(conversas, opcoes = {}) {
  const slots = [], efeitos = [];
  let indice = 0, alterou = true, arvore;
  const react = {
    memo: componente => componente,
    useState(inicial) {
      const i = indice++;
      if (!(i in slots)) slots[i] = typeof inicial === 'function' ? inicial() : inicial;
      return [slots[i], valor => { slots[i] = typeof valor === 'function' ? valor(slots[i]) : valor; alterou = true; }];
    },
    useRef(inicial) { const i = indice++; if (!(i in slots)) slots[i] = { current: inicial }; return slots[i]; },
    useMemo(calcular) { indice++; return calcular(); },
    useEffect(acao, deps) {
      const i = indice++, anterior = slots[i];
      if (!anterior || deps.some((valor, n) => valor !== anterior.deps[n])) {
        slots[i] = { deps, limpar: anterior?.limpar };
        efeitos.push(() => { slots[i].limpar?.(); slots[i].limpar = acao(); });
      }
    },
  };
  react.default = react;
  const chamadas = [], avisos = [], concluidos = [];
  const { createChatSlice } = carregar('src/store/chatSlice.ts', { '@/Interfaces': interfaces });
  let estado;
  const acoes = createChatSlice(acao => { estado = { ...estado, ...(typeof acao === 'function' ? acao(estado) : acao) }; });
  estado = { ...acoes, chats: conversas.slice(), activeChat: conversas[0] ?? null, socket: null };
  const useChatStore = selecionar => selecionar(estado);
  useChatStore.getState = () => estado;
  const props = {
    conversas, ocupado: false, todosVisiveisSelecionados: false, semConversasVisiveis: false,
    onOcupado(valor) { props.ocupado = valor; alterou = true; },
    onSelecionarVisiveis() {},
    onCancelar() { props.conversas = []; alterou = true; },
    onConcluidos(ids) { concluidos.push(...ids); props.conversas = props.conversas.filter(c => !ids.includes(c.id)); alterou = true; },
  };
  const FetchReq = async (entrada, variaveis) => {
    const endpoint = typeof entrada === 'string' ? entrada : entrada.endpoint;
    const id = String((variaveis ?? entrada.variables)[0]);
    chamadas.push({ endpoint, id, body: entrada.body });
    if (endpoint === 'ConsultarFluxoSaidaAtendimento') {
      if (opcoes.falhaConsulta === id) throw new Error('Falha simulada de consulta');
      return opcoes.fluxos?.[id] ?? null;
    }
    if (opcoes.falha === id) throw { response: { data: { message: 'Você não tem acesso a este atendimento' } } };
    if (endpoint === 'FinalizarAtendimentoChat') return { ...estado.chats.find(c => c.id === id),
      support_chat_status_id: 5, paused_at: null, pos_atendimento_ativo: !!opcoes.posAtendimento?.includes(id) };
    if (endpoint === 'FinalizarSemAtendimento') return { ...estado.chats.find(c => c.id === id), support_chat_status_id: 4 };
  };
  const modulos = {
    react,
    '@/Interfaces': interfaces,
    '@/service/AcoesAtendimentosEmLote': lote,
    '@/service/Api/ApiClient': { default: () => ({ FetchReq }) },
    '@/hooks/usePermissoes': { usePermissoes: () => ({ usuarioId: 7, ehSuperusuario: false, pode: () => opcoes.podeFinalizar !== false }) },
    '@/store/useChatStore': { useChatStore },
    '@/service/Util': { nomeExibicao: contato => contato?.name, nomeCompleto: contato => contato?.name, fixHeartEmoji: texto => texto },
    '@/components/LabelPlus': { default: 'label' },
    '@/components/ToastGlobal': { mostrarToast: (...args) => avisos.push(args) },
  };
  for (const [pacote, nome] of Object.entries({ button: 'Button', checkbox: 'Checkbox', dialog: 'Dialog', inputswitch: 'InputSwitch', message: 'Message' })) {
    modulos[`primereact/${pacote}`] = { [nome]: nome };
  }
  if (opcoes.lista) {
    Object.assign(modulos, {
      '@/layout/context/layoutcontext': { useLayoutStore: () => ({ setBreadcrumbs() {} }) },
      '@/service/Vcard': { resumoDoContato: () => null },
      '@/hooks/useAvisarEvento': { useAvisarEvento: () => ({ avisar() {} }), podeTocarSom: () => false },
      '@/hooks/useAjustesAtendimento': { useAjustesAtendimento: () => ({ ajustes: { chatbot_habilitado: true } }) },
      '@/hooks/useChatInterno': { useChatInterno: () => ({ carregarMensagens() {} }) },
      '@/hooks/useUsuarioLogado': { useUsuarioLogado: () => ({ usuarioId: 7 }) },
      '@/hooks/usePermissoesModulo': { usePermissoesModulo: () => ({ podeVisualizar: false }) },
      '@/store/useChatInternoStore': { useChatInternoStore: selecionar => selecionar({ aba: 'atendimentos', setAba() {}, conversas: [] }) },
      '@/store/chatSlice': carregar('src/store/chatSlice.ts', { '@/Interfaces': interfaces }),
      './IdentificacaoConversa': { CabecalhoConversa: 'CabecalhoConversa', ResponsavelConversa: 'ResponsavelConversa' },
      'primereact/badge': { Badge: 'Badge' },
    });
    for (const caminho of ['@/components/Avatar', '@/components/Interweave', './AcoesConversa', './AcoesSelecaoAtendimentos',
      './ModalNovoAtendimento', '@/components/ModalNovoCompromisso', '../../_ChatInterno/AbasConversa', '../../_ChatInterno/ListaColegas']) {
      modulos[caminho] = { default: caminho };
    }
    const filtros = carregar('src/app/(main)/chat/[[...id]]/_ChatSection/Conversation/FiltroAtendimentos.tsx', modulos);
    modulos['./FiltroAtendimentos'] = { ...filtros, default: 'FiltroAtendimentos' };
  }
  // As dependências default precisam do mesmo marcador dos módulos compilados.
  for (const valor of Object.values(modulos)) if (valor.default) valor.__esModule = true;
  const Componente = carregar(`src/app/(main)/chat/[[...id]]/_ChatSection/Conversation/${opcoes.lista ? 'index' : 'AcoesSelecaoAtendimentos'}.tsx`, modulos).default;
  function render() { indice = 0; alterou = false; arvore = Componente(props); }
  async function estabilizar() {
    for (let i = 0; i < 40; i++) {
      if (alterou) render();
      efeitos.splice(0).forEach(acao => acao());
      await new Promise(resolve => setImmediate(resolve));
      if (!alterou && !efeitos.length) return;
    }
    throw new Error('Componente não estabilizou');
  }
  function elementos(no, resultado = []) {
    if (arguments.length === 0) no = arvore;
    if (Array.isArray(no)) { no.forEach(filho => elementos(filho, resultado)); return resultado; }
    if (!no || typeof no !== 'object' || !no.props) return resultado;
    resultado.push(no); elementos(no.props.children, resultado); elementos(no.props.footer, resultado);
    return resultado;
  }
  const botao = rotulo => elementos().find(no => no.type === 'Button' && no.props.label === rotulo);
  async function abrir() { botao('Finalizar').props.onClick(); await estabilizar(); }
  return { props, chamadas, avisos, concluidos, estabilizar, elementos, botao, abrir, estado: () => estado };
}

async function testar() {
  assert.equal(lote.impedimentoFinalizacaoLote(chat(1), 7, false, true), undefined);
  assert.equal(lote.impedimentoFinalizacaoLote(chat(1, { paused_at: '2026-11-06' }), 7, false, true), undefined);
  assert.match(lote.impedimentoFinalizacaoLote(chat(1, { user_id: 8 }), 7, false, true), /assumiu/);
  assert.equal(lote.impedimentoFinalizacaoLote(chat(1, { user_id: 8 }), 7, true, true), undefined);
  assert.equal(lote.impedimentoFinalizacaoLote(chat(1, { support_chat_status_id: 1, user_id: null, contact: {} }), 7, false, true), undefined);
  assert.equal(lote.impedimentoFinalizacaoLote(chat(1, { support_chat_status_id: 3, user_id: null, contact: {} }), 7, false, true), undefined);
  assert.match(lote.impedimentoFinalizacaoLote(chat(1, { contact: {} }), 7, false, true), /Associe/);
  assert.equal(lote.impedimentoFinalizacaoLote(chat(1, { contact: { has_no_client: true } }), 7, false, true), undefined);
  assert.match(lote.impedimentoFinalizacaoLote(chat(1), 7, false, false), /permissão/);
  assert.deepEqual(lote.manterSelecaoDisponivel(['1', '2'], [chat(2)]), ['2']);
  assert.deepEqual(lote.corpoFinalizacaoLote(obrigatorio, true, false), { sem_despedida: false });
  assert.deepEqual(lote.corpoFinalizacaoLote(opcional, false, true), { sem_despedida: true, executar_fluxo_saida: true });
  assert.deepEqual(lote.corpoFinalizacaoLote(null, false, true), { sem_despedida: true, executar_fluxo_saida: false });

  const ordem = [], progresso = [];
  const resultados = await lote.executarAcaoEmLote(['1', '2', '1', '3'], async id => {
    ordem.push(id); if (id === '2') throw { response: { data: { message: ['Falha', 'simulada'] } } }; return id;
  }, (atual, total) => progresso.push([atual, total]));
  assert.deepEqual(ordem, ['1', '2', '3']);
  assert.deepEqual(resultados.map(r => r.sucesso), [true, false, true]);
  assert.equal(resultados[1].erro, 'Falha simulada');
  assert.deepEqual(progresso, [[1, 3], [2, 3], [3, 3]]);

  const leitura = preparar([chat(11), chat(12)], { falha: '12' });
  await leitura.estabilizar();
  const acaoLer = leitura.botao('Marcar como lida').props.onClick;
  await Promise.all([acaoLer(), acaoLer()]); // Clique duplo sem um render intermediário.
  await leitura.estabilizar();
  assert.equal(leitura.chamadas.length, 2);
  assert.deepEqual(leitura.concluidos, ['11']);
  assert.equal(leitura.estado().chats[0].unread_count, 0);
  assert.equal(leitura.estado().chats[0].marked_unread, false);
  assert.equal(leitura.estado().activeChat.marked_unread, false);
  assert.equal(leitura.estado().chats[1].unread_count, 3);
  assert.deepEqual(leitura.props.conversas.map(c => c.id), ['12']);
  assert.equal(leitura.avisos[0][2], 'warn');
  leitura.botao('Cancelar seleção').props.onClick();
  assert.equal(leitura.chamadas.length, 2);
  assert.equal(leitura.props.conversas.length, 0);

  const encerramento = preparar([chat(21), chat(22), chat(23, { channel_id: 20, channel: { id: 20, name: 'Canal B' } })], {
    fluxos: { 21: obrigatorio, 22: obrigatorio, 23: opcional }, falha: '22', posAtendimento: ['23'],
  });
  await encerramento.estabilizar(); await encerramento.abrir();
  const switches = encerramento.elementos().filter(no => no.type === 'InputSwitch');
  assert.equal(switches.length, 3); // Despedida e dois canais, sem duplicar o canal A.
  assert.equal(switches[1].props.disabled, true);
  assert.equal(switches[1].props.checked, true);
  switches[0].props.onChange({ value: false });
  switches[2].props.onChange({ value: true });
  await encerramento.estabilizar();
  assert.ok(!encerramento.elementos().some(no => no.type === 'InputTextarea'));
  const finalizar = encerramento.botao('Finalizar 3 atendimentos').props.onClick;
  await Promise.all([finalizar(), finalizar()]); await encerramento.estabilizar();
  const envios = encerramento.chamadas.filter(c => c.endpoint === 'FinalizarAtendimentoChat');
  assert.equal(envios.length, 3);
  assert.deepEqual(envios[0].body, { sem_despedida: true });
  assert.deepEqual(envios[2].body, { sem_despedida: true, executar_fluxo_saida: true });
  assert.deepEqual(encerramento.concluidos, ['21', '23']);
  assert.deepEqual(encerramento.props.conversas.map(c => c.id), ['22']);
  assert.equal(encerramento.estado().activeChat, null);
  assert.equal(encerramento.estado().chats.find(c => c.id === '23').pos_atendimento_ativo, true);
  assert.equal(encerramento.avisos[0][2], 'warn');

  const cancelar = preparar([chat(31)]);
  await cancelar.estabilizar(); await cancelar.abrir();
  cancelar.botao('Cancelar').props.onClick(); await cancelar.estabilizar();
  assert.ok(!cancelar.chamadas.some(c => c.endpoint === 'FinalizarAtendimentoChat'));
  assert.equal(cancelar.elementos().find(no => no.type === 'Dialog').props.visible, false);

  const bloqueados = preparar([chat(41, { pos_atendimento_ativo: true }), chat(42, { user_id: 8 }), chat(43)], { falhaConsulta: '43' });
  await bloqueados.estabilizar(); await bloqueados.abrir();
  assert.equal(bloqueados.chamadas.length, 1); // Consulta apenas o apto.
  assert.equal(bloqueados.botao('Finalizar 0 atendimentos').props.disabled, true);
  assert.ok(!bloqueados.chamadas.some(c => c.endpoint === 'FinalizarAtendimentoChat'));

  const misto = preparar([chat(71, { paused_at: '2026-11-06' }),
    chat(72, { support_chat_status_id: 1, user_id: null, contact: {} }),
    chat(73, { support_chat_status_id: 3, user_id: null, contact: {} })], { fluxos: { 71: obrigatorio } });
  await misto.estabilizar(); await misto.abrir();
  assert.equal(misto.chamadas.filter(c => c.endpoint === 'ConsultarFluxoSaidaAtendimento').length, 1);
  await misto.botao('Finalizar 3 atendimentos').props.onClick(); await misto.estabilizar();
  const encerrados = misto.chamadas.filter(c => c.endpoint.startsWith('Finalizar'));
  assert.deepEqual(encerrados.map(c => c.endpoint), ['FinalizarAtendimentoChat', 'FinalizarSemAtendimento', 'FinalizarSemAtendimento']);
  assert.deepEqual(encerrados.map(c => c.body), [{ sem_despedida: false }, {}, {}]);
  assert.deepEqual(misto.concluidos, ['71', '72', '73']);
  assert.equal(misto.estado().chats.length, 0);

  const represados = preparar([chat(81, { support_chat_status_id: 1, user_id: null, contact: {} })]);
  await represados.estabilizar(); await represados.abrir();
  assert.equal(represados.chamadas.length, 0);
  assert.equal(represados.elementos().filter(no => no.type === 'InputSwitch').length, 0);
  await represados.botao('Finalizar 1 atendimentos').props.onClick(); await represados.estabilizar();
  assert.equal(represados.chamadas[0].endpoint, 'FinalizarSemAtendimento');
  assert.deepEqual(represados.chamadas[0].body, {});

  const somenteLeitura = preparar([chat(51)], { podeFinalizar: false });
  await somenteLeitura.estabilizar();
  assert.equal(somenteLeitura.botao('Finalizar'), undefined);
  assert.ok(somenteLeitura.botao('Marcar como lida'));

  const listeners = new Map();
  global.window = { localStorage: { getItem: () => null },
    addEventListener: (nome, acao) => listeners.set(nome, acao), removeEventListener: nome => listeners.delete(nome) };
  global.document = { querySelector: () => null };
  try {
    const lista = preparar([chat(61), chat(62)], { lista: true });
    await lista.estabilizar();
    const encontrar = (tipo, propriedade, valor) => lista.elementos().find(no => no.type === tipo && no.props[propriedade] === valor);
    encontrar('Button', 'aria-label', 'Selecionar múltiplos atendimentos').props.onClick();
    await lista.estabilizar();
    const cartoes = lista.elementos().filter(no => no.type === 'li' && no.props.onClick);
    cartoes[0].props.onClick(); await lista.estabilizar();
    let barra = encontrar('./AcoesSelecaoAtendimentos', 'ocupado', false);
    assert.deepEqual(barra.props.conversas.map(c => c.id), ['61']);
    assert.equal(lista.chamadas.length, 0); // Selecionar não abre nem marca a conversa como lida.
    barra.props.onSelecionarVisiveis(true); await lista.estabilizar();
    barra = encontrar('./AcoesSelecaoAtendimentos', 'ocupado', false);
    assert.equal(barra.props.conversas.length, 2);
    assert.equal(barra.props.todosVisiveisSelecionados, true);
    encontrar('FiltroAtendimentos', 'grupoAtivo', 'todos').props.onSelecionar('andamento');
    await lista.estabilizar();
    assert.equal(encontrar('./AcoesSelecaoAtendimentos', 'ocupado', false).props.conversas.length, 0);
    assert.ok(!lista.elementos().some(no => no.type === './AcoesConversa'));
    listeners.get('keydown')({ key: 'Escape', target: { closest: () => null } });
    await lista.estabilizar();
    assert.ok(!lista.elementos().some(no => no.type === './AcoesSelecaoAtendimentos'));
    assert.equal(lista.estado().activeChat.id, '61'); // Cancelar a seleção não fecha a conversa aberta.
    assert.equal(lista.chamadas.length, 0);
  } finally { delete global.window; delete global.document; }
  console.log('Seleção múltipla validada: regras, padrões por canal, bloqueios, cancelamento sem ações, leitura, falhas parciais, clique duplo e atualização da store. Nenhum envio real.');
}
testar().catch(erro => { console.error(erro); process.exitCode = 1; });
