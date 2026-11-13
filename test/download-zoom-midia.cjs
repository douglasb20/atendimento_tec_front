// Executar em front/: node test/download-zoom-midia.cjs
const assert = require('node:assert/strict');
const { carregar } = require('./selecao-atendimentos.cjs');

(async () => {
  const chamadas = [], links = [], erros = [];
  const { baixarMidia } = carregar('src/service/BaixarMidia.ts', {
    '@/service/Api/ApiClient': { default: () => ({ FetchReq: async (...args) => {
      chamadas.push(args); return { url: 'https://storage/assinada' };
    } }) },
    '@/service/Util': { CatchAlerta: erro => erros.push(erro) },
  });
  global.document = { createElement: () => ({ click() { links.push({ ...this }); }, remove() {} }), body: { appendChild() {} } };
  try {
    await baixarMidia({ support_chat_id: '42', message_id: 'WA/ID', media_url: 'https://storage/imagem', file_name: 'Foto.png' });
    assert.deepEqual(chamadas[0], ['BaixarMidiaAtendimento', ['42', 'WA%2FID']]);
    assert.equal(links[0].href, 'https://storage/assinada');
    assert.equal(links[0].target, '_blank');
    assert.equal(links[0].download, 'Foto.png');
    await baixarMidia({ media_url: 'blob:previa', file_name: 'Local.png' });
    assert.equal(chamadas.length, 1);
    assert.equal(links[1].href, 'blob:previa');
    assert.equal(erros.length, 0);
  } finally { delete global.document; }

  const estados = [], refs = [];
  let indice = 0, refIndice = 0, fechou = 0, baixou = 0;
  const Visualizador = carregar('src/app/(main)/chat/[[...id]]/_ChatSection/_components/VisualizadorImagem.tsx', {
    react: {
      useState: inicial => { const i = indice++; if (!(i in estados)) estados[i] = inicial;
        return [estados[i], valor => { estados[i] = typeof valor === 'function' ? valor(estados[i]) : valor; }]; },
      useRef: inicial => { const i = refIndice++; return refs[i] ?? (refs[i] = { current: inicial }); },
    },
    'primereact/dialog': { Dialog: 'Dialog' }, 'primereact/button': { Button: 'Button' },
  }).default;
  let arvore;
  const renderizar = () => { indice = 0; refIndice = 0; arvore = Visualizador({ src: 'imagem', onFechar: () => fechou++, onBaixar: () => baixou++ }); };
  function elementos(no, itens = []) {
    if (!arguments.length) no = arvore;
    if (Array.isArray(no)) { no.forEach(filho => elementos(filho, itens)); return itens; }
    if (!no?.props) return itens;
    itens.push(no); elementos(no.props.children, itens); return itens;
  }
  const botao = nome => elementos().find(no => no.props['aria-label'] === nome);
  renderizar();
  refs[0].current = { clientWidth: 700, clientHeight: 500 };
  elementos().find(no => no.type === 'img').props.onLoad({ currentTarget: { naturalWidth: 1000, naturalHeight: 2000 } });
  renderizar();
  assert.equal(elementos().find(no => no.type === 'img').props.style.width, 238);
  for (let i = 0; i < 12; i++) { botao('Aumentar zoom').props.onClick(); renderizar(); }
  assert.equal(elementos().find(no => no.type === 'img').props.style.width, 952);
  assert.equal(arvore.props.showHeader, false);
  assert.equal(arvore.props.style.background, 'transparent');
  botao('Girar para a direita').props.onClick(); renderizar();
  let moldura = elementos().find(no => no.props.onPointerDown).props.children.props.children;
  assert.equal(moldura.props.style.width, 1904);
  assert.equal(moldura.props.style.height, 952);
  assert.match(elementos().find(no => no.type === 'img').props.style.transform, /rotate\(90deg\)/);
  botao('Girar para a esquerda').props.onClick(); renderizar();
  const area = elementos().find(no => no.props.onPointerDown);
  assert.equal(area.props.style.overflow, 'auto');
  const alvo = { scrollLeft: 20, scrollTop: 40, clientWidth: 700, clientHeight: 500,
    getBoundingClientRect: () => ({ left: 0, top: 0 }), setPointerCapture() {} };
  area.props.onPointerDown({ button: 0, pointerId: 1, clientX: 100, clientY: 200, currentTarget: alvo });
  area.props.onPointerMove({ clientX: 50, clientY: 50, currentTarget: alvo });
  assert.equal(alvo.scrollLeft, 70);
  assert.equal(alvo.scrollTop, 190);
  area.props.onPointerUp();
  const clicar = target => {
    area.props.onPointerDown({ button: 0, pointerId: 1, clientX: 50, clientY: 50, currentTarget: alvo, target });
    area.props.onPointerUp();
    area.props.onClick({ currentTarget: alvo, clientX: 50, clientY: 50 });
  };
  area.props.onClick({ currentTarget: alvo, clientX: 50, clientY: 50 });
  assert.equal(fechou, 0, 'Arrastar não fecha');
  clicar({ closest: () => ({}) });
  assert.equal(fechou, 0, 'Clicar na imagem não fecha, mesmo após captura do ponteiro');
  clicar({ closest: () => null });
  assert.equal(fechou, 1, 'Clicar no fundo fecha');
  area.props.onClick({ currentTarget: alvo, clientX: 710, clientY: 50 });
  assert.equal(fechou, 1, 'Clicar na barra de rolagem não fecha');
  if (process.env.PLAYWRIGHT_MODULE) {
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
    const navegador = await chromium.launch({ executablePath: process.env.CHROME_EXECUTAVEL, args: ['--no-sandbox'] });
    try {
      const pagina = await navegador.newPage({ viewport: { width: 900, height: 700 } });
      const fs = require('node:fs');
      const css = require('sass').compile('src/styles/layout/_utils.scss').css;
      await pagina.setContent('<style>' + fs.readFileSync('public/theme/theme.css', 'utf8') + css +
        '</style><div class="visualizador-imagem-mascara p-dialog-mask p-component-overlay p-component-overlay-enter">' +
        '<button class="visualizador-imagem-controle p-button"><span class="p-button-icon">+</span></button></div>');
      await pagina.waitForTimeout(200);
      const aparencia = await pagina.evaluate(() => ({
        fundo: getComputedStyle(document.querySelector('.p-dialog-mask')).backgroundColor,
        animacao: getComputedStyle(document.querySelector('.p-dialog-mask')).animationName,
        icone: parseFloat(getComputedStyle(document.querySelector('.p-button-icon')).fontSize),
      }));
      assert.equal(aparencia.fundo, 'rgba(0, 0, 0, 0.8)');
      assert.equal(aparencia.animacao, 'none');
      assert.ok(aparencia.icone >= 22);
      const moldura = area.props.children.props.children;
      const imagem = moldura.props.children;
      const src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="2000"><rect width="1000" height="2000" fill="blue"/></svg>');
      const tela = React.cloneElement(area, {}, React.cloneElement(area.props.children, {},
        React.cloneElement(moldura, {}, React.cloneElement(imagem, { src }))));
      await pagina.setContent('<div style="height:500px;width:700px;display:flex;flex-direction:column">' + renderToStaticMarkup(tela) + '</div>');
      await pagina.waitForFunction(() => document.querySelector('img').naturalHeight > 0);
      for (const rotacao of [0, 90, 180, 270]) {
        const medidas = await pagina.evaluate(rotacao => {
          const imagem = document.querySelector('img');
          const moldura = imagem.parentElement;
          const largura = parseFloat(imagem.style.width), altura = parseFloat(imagem.style.height);
          moldura.style.width = `${rotacao % 180 ? altura : largura}px`;
          moldura.style.height = `${rotacao % 180 ? largura : altura}px`;
          imagem.style.transform = `translate(-50%, -50%) rotate(${rotacao}deg)`;
          const painel = moldura.parentElement.parentElement;
          painel.scrollTo({ top: painel.scrollHeight, left: painel.scrollWidth });
          return { vertical: painel.scrollTop > 0, horizontal: painel.scrollLeft > 0,
            fim: painel.scrollTop + painel.clientHeight >= painel.scrollHeight - 1,
            direita: painel.scrollLeft + painel.clientWidth >= painel.scrollWidth - 1 };
        }, rotacao);
        assert.deepEqual(medidas, { vertical: true, horizontal: true, fim: true, direita: true });
      }
      console.log('Chrome: imagem a 400% rolável até as bordas nas quatro rotações.');
    } finally { await navegador.close(); }
  }
  botao('Restaurar zoom').props.onClick(); renderizar();
  assert.equal(elementos().find(no => no.type === 'img').props.style.width, 238);
  botao('Baixar imagem').props.onClick(); botao('Fechar imagem').props.onClick();
  assert.equal(baixou, 1); assert.equal(fechou, 2);
  console.log('Download e zoom validados: URL autorizada, blob local, nova aba, nome, ampliação, rolagem, arraste e fechamento.');
})().catch(erro => { console.error(erro); process.exitCode = 1; });
