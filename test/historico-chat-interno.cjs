// node test/historico-chat-interno.cjs
// Para conferir geometria: PLAYWRIGHT_MODULE=<módulo> CHROME_EXECUTAVEL=<binário> node test/historico-chat-interno.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { carregar } = require('./selecao-atendimentos.cjs');

const caminho = 'src/app/(main)/chat/[[...id]]/_ChatInterno/';
let efeitos = [];
const referencias = [];
const react = {
  ...React, default: React,
  useEffect: efeito => efeitos.push(efeito),
  useMemo: calcular => calcular(),
  useCallback: funcao => funcao,
  useRef: valor => { const ref = { current: valor }; referencias.push(ref); return ref; },
  useState: () => [true, () => {}],
};
const estado = {
  ativo: { id: 8, name: 'Nome muito longo do técnico '.repeat(8) },
  aba: 'interno', modo: 'painel', presencas: {}, conversas: [], carregandoMensagens: false,
  mensagens: Array.from({ length: 1000 }, (_, id) => ({ id, sender_id: 7, created_at: '2026-11-12T12:00:00Z' })),
};
const deps = {
  react,
  'react-dom': { createPortal: conteudo => conteudo },
  '@/store/useChatInternoStore': { useChatInternoStore: selecionar => selecionar(estado) },
  '@/hooks/useUsuarioLogado': { useUsuarioLogado: () => ({ usuarioId: 7 }) },
  './useEnvioInterno': { useEnvioInterno: () => ({}) },
  './CaixaEnvioInterna': { default: () => React.createElement('div', {
    'data-envio': '', style: { flexShrink: 0, height: 64 },
  }, 'Caixa de mensagem') },
  './MensagemInterna': { default: () => React.createElement('div', { style: { height: 28 } }, 'Mensagem de teste') },
  '@/components/Avatar': { default: () => React.createElement('div', { style: { width: 38, height: 38 } }) },
  './BolinhaPresenca': { default: () => null },
  'primereact/progressspinner': { ProgressSpinner: () => null },
};
const Janela = carregar(caminho + 'JanelaInterna.tsx', deps).default;
const Cabecalho = carregar(caminho + 'CabecalhoInterno.tsx', deps).default;
deps['./JanelaInterna'] = { default: Janela };
const Popup = carregar(caminho + 'PopupInterno.tsx', deps).default;

// O efeito real deve rolar apenas o histórico, sem usar scrollIntoView nos ancestrais.
Janela({ semCabecalho: true });
let rolou = false;
referencias.at(-1).current = {
  scrollHeight: 28_000,
  scrollTo: opcoes => { assert.deepEqual(opcoes, { top: 28_000, behavior: 'smooth' }); rolou = true; },
};
efeitos.forEach(efeito => efeito());
assert.equal(rolou, true);
efeitos = [];

const chatStore = {
  addChats() {}, setActiveChat() {}, setLoadMessages() {}, addMessages() {}, setChatNotFound() {},
  activeChat: null, chatNotFound: false, loadMessages: false,
};
const ChatSection = carregar('src/app/(main)/chat/[[...id]]/_ChatSection/index.tsx', {
  ...deps,
  'next/navigation': { useParams: () => ({}) },
  '@/service/Api/ApiClient': { default: () => ({}) },
  '@/store/useChatStore': { useChatStore: selecionar => selecionar(chatStore) },
  './Conversation': { default: () => React.createElement('div', null, 'Lista') },
  '../_ChatInterno/CabecalhoInterno': { default: Cabecalho },
  '../_ChatInterno/JanelaInterna': { default: Janela },
  './MessageItem': { default: () => null },
}).default;

(async () => {
  const painel = renderToStaticMarkup(React.createElement(ChatSection, {}));
  estado.modo = 'popup';
  let popup;
  global.document = { body: {} };
  try {
    popup = renderToStaticMarkup(React.createElement(Popup));
  } finally {
    delete global.document;
  }
  assert.match(painel, /chat-interno-janela/);
  assert.match(painel, /title="Fechar conversa"/);
  assert.match(popup, /title="Fechar"/);
  const sass = require('sass');
  const css = sass.compileString(fs.readFileSync('src/styles/layout/_utils.scss', 'utf8') +
    fs.readFileSync('src/styles/layout/_chat_responsivo.scss', 'utf8')).css;
  console.log('Rolagem do histórico e compilação dos estilos validadas.');

  if (!process.env.PLAYWRIGHT_MODULE) return;
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
  const navegador = await chromium.launch({ executablePath: process.env.CHROME_EXECUTAVEL, headless: true, args: ['--no-sandbox'] });
  try {
    const pagina = await navegador.newPage();
    const primeflex = fs.readFileSync(require.resolve('primeflex/primeflex.css'), 'utf8');
    for (const [largura, altura] of [[1440, 900], [1024, 600], [390, 700], [360, 480]]) {
      await pagina.setViewportSize({ width: largura, height: altura });
      for (const modo of ['painel', 'popup']) {
        await pagina.setContent(`<style>${primeflex}\n${css}\nhtml{font-size:14px}body{margin:0}button{height:32px}</style>` +
          (modo === 'painel' ? `<div style="padding-top:64px"><div class="grid p-fluid chat-layout">${painel}</div></div>` : popup));
        const resultado = await pagina.evaluate(async modo => {
          const historico = document.querySelector('.chat-interno-historico');
          historico.scrollTo({ top: historico.scrollHeight });
          await new Promise(resolve => requestAnimationFrame(resolve));
          const fechar = document.querySelector(modo === 'painel' ? '[title="Fechar conversa"]' : '[title="Fechar"]');
          const caixa = document.querySelector('[data-envio]');
          const visivel = elemento => {
            const rect = elemento.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth;
          };
          return { fechar: visivel(fechar), envio: visivel(caixa), pagina: scrollY,
            historicoRola: historico.scrollHeight > historico.clientHeight && historico.clientHeight > 0,
            historicoNoFim: historico.scrollTop > 0 };
        }, modo);
        assert.deepEqual(resultado, { fechar: true, envio: true, pagina: 0, historicoRola: true, historicoNoFim: true }, `${modo} ${largura}x${altura}`);
      }
    }
    console.log('Chrome: 1.000 mensagens e nome longo, painel/popup em quatro tamanhos, Fechar e envio visíveis sem rolar a página.');
  } finally {
    await navegador.close();
  }
})().catch(erro => { console.error(erro); process.exitCode = 1; });
