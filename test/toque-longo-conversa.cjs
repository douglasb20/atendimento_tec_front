// Executar em front/: node test/toque-longo-conversa.cjs
const assert = require('node:assert/strict');
const { carregar } = require('./selecao-atendimentos.cjs');
const { registrarToqueLongoConversa } = carregar('src/service/ToqueLongoConversa.ts');
const setOriginal = global.setTimeout, clearOriginal = global.clearTimeout;
const timers = new Map();
let contador = 0;
global.setTimeout = (acao, atraso) => { const id = ++contador; timers.set(id, { acao, atraso }); return id; };
global.clearTimeout = id => timers.delete(id);
class Cartao extends EventTarget { closest() { return this.interativo ? this : null; } }
const cartao = new Cartao(), aberturas = [];
const disparar = (tipo, extras = {}) => {
  const evento = new Event(tipo, { cancelable: true });
  Object.assign(evento, { pointerType: 'touch', isPrimary: true, pointerId: 1,
    clientX: 100, clientY: 200, pageX: 100, pageY: 200, ...extras });
  cartao.dispatchEvent(evento); return evento;
};
const aguardar = () => { for (const [id, timer] of [...timers]) { timers.delete(id); assert.equal(timer.atraso, 550); timer.acao(); } };
let limpar;
try {
  limpar = registrarToqueLongoConversa(cartao, evento => aberturas.push(evento));
  disparar('pointerdown'); disparar('pointerup'); aguardar();
  assert.equal(aberturas.length, 0, 'Toque curto não abre menu');
  assert.equal(disparar('click').defaultPrevented, false);

  disparar('pointerdown'); aguardar(); disparar('pointerup');
  assert.equal(aberturas.length, 1);
  assert.equal(aberturas[0].pageY, 200);
  assert.equal(disparar('click').defaultPrevented, true, 'Segurar não abre a conversa ao soltar');
  disparar('pointerdown'); disparar('pointerup');
  assert.equal(disparar('click').defaultPrevented, false, 'Próximo toque curto funciona');

  disparar('pointerdown'); disparar('pointermove', { clientY: 220 }); aguardar();
  assert.equal(aberturas.length, 1, 'Rolar cancela o gesto');
  for (const cancelamento of ['pointercancel', 'pointerleave']) {
    disparar('pointerdown'); disparar(cancelamento); aguardar();
    assert.equal(aberturas.length, 1);
  }
  disparar('pointerdown', { pointerType: 'mouse' }); aguardar();
  assert.equal(aberturas.length, 1, 'Mouse mantém o chevron existente');
  cartao.interativo = true;
  disparar('pointerdown'); aguardar();
  assert.equal(aberturas.length, 1, 'Botões e campos não disparam toque longo');
  cartao.interativo = false;
  disparar('pointerdown'); disparar('pointerdown', { isPrimary: false, pointerId: 2 }); aguardar();
  assert.equal(aberturas.length, 1, 'Segundo dedo cancela o gesto');

  disparar('pointerdown');
  assert.equal(disparar('contextmenu').defaultPrevented, true);
  aguardar(); disparar('pointercancel');
  assert.equal(aberturas.length, 2, 'Menu nativo antecipado abre uma única vez');
  assert.equal(disparar('click').defaultPrevented, true);
  disparar('pointerdown'); limpar(); aguardar();
  assert.equal(aberturas.length, 2, 'Desmontar cancela o gesto pendente');
  disparar('pointerdown'); aguardar();
  assert.equal(aberturas.length, 2, 'Desmontar remove os listeners');
  console.log('Toque longo: menu, toque curto, rolagem, cancelamento, multitouch e limpeza validados.');
} finally {
  limpar?.(); global.setTimeout = setOriginal; global.clearTimeout = clearOriginal;
}

// O componente real compartilha as ações e permissões entre os dois menus.
const refs = [], efeitos = [];
const interfaces = carregar('src/Interfaces/suport-chat.interface.ts');
const dependencias = {
  react: { useRef: valor => { const ref = { current: valor }; refs.push(ref); return ref; },
    useState: valor => [valor, () => {}], useEffect: acao => efeitos.push(acao) },
  'primereact/button': { Button: 'Button' }, 'primereact/menu': { Menu: 'Menu' },
  'primereact/contextmenu': { ContextMenu: 'ContextMenu' }, '@/Interfaces': interfaces,
  '@/hooks/usePermissoesModulo': { usePermissoesModulo: () => ({ podeEditar: false, podeAcao: () => false }) },
  '@/hooks/useUsuarioLogado': { useUsuarioLogado: () => ({ usuarioId: 7 }) },
  '@/service/Api/ApiClient': { default: () => ({ FetchReq() {} }) },
  '@/service/Util': { CatchAlerta() {} }, '@/store/chatSlice': { marcarContatoAtualizadoLocalmente() {} },
  '@/store/useChatStore': { useChatStore: selecionar => selecionar({ updateChat() {}, setUnreadCount() {} }) },
  '@/service/ToqueLongoConversa': { registrarToqueLongoConversa },
};
for (const nome of ['ModalContatoChat', 'ModalFinalizarAtendimento', 'ModalTransferirAtendimento', 'SidebarDetalhesContato']) {
  dependencias['../_components/' + nome] = { default: nome };
}
const AcoesConversa = carregar('src/app/(main)/chat/[[...id]]/_ChatSection/Conversation/AcoesConversa.tsx', dependencias).default;
const arvore = AcoesConversa({ conversa: { id: '10', user_id: 7, support_chat_status_id: 2, unread_count: 3 } });
const menus = arvore.props.children.filter(no => no?.type === 'Menu' || no?.type === 'ContextMenu');
assert.equal(menus.length, 2);
assert.equal(menus[0].props.model, menus[1].props.model);
for (const menu of menus) {
  assert.equal(menu.props.style.width, 'max-content');
  assert.equal(menu.props.style.maxWidth, 'calc(100vw - 1rem)');
  assert.equal(menu.props.pt?.label?.className?.includes('white-space-nowrap') ?? false, false);
}
assert.equal(menus[0].props.model[0].label, 'Marcar como lida');
assert.ok(!menus[0].props.model.some(item => item.label === 'Finalizar'), 'Menu por toque respeita permissões');
let mostrou = false;
refs[1].current = { show: evento => { mostrou = evento.pageX === 100; } };
refs[2].current = { closest: () => cartao };
const limparComponente = efeitos[0]();
disparar('pointerdown'); disparar('contextmenu');
assert.equal(mostrou, true, 'Gesto chama o ContextMenu do card correto');
limparComponente();
console.log('Integração validada: ContextMenu compartilha o modelo do chevron e respeita permissões.');
