// node test/rolagem-conversa.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { carregar } = require('./selecao-atendimentos.cjs');

(async () => {
  let callback, desconectou = false, segue = true;
  global.ResizeObserver = class {
    constructor(acao) { callback = acao; }
    observe() {}
    disconnect() { desconectou = true; }
  };
  try {
    const { observarFimDaConversa } = carregar('src/service/RolagemConversa.ts');
    const area = { scrollTop: 0, scrollHeight: 1200, clientHeight: 300 };
    const limpar = observarFimDaConversa(area, {}, () => segue);
    assert.equal(area.scrollTop, 1200);
    area.scrollHeight = 1800; callback(); assert.equal(area.scrollTop, 1800);
    segue = false; area.scrollTop = 100;
    area.scrollHeight = 2400; callback(); assert.equal(area.scrollTop, 100);
    limpar(); assert.equal(desconectou, true);
  } finally { delete global.ResizeObserver; }
  console.log('Acompanhamento do histórico e limpeza do observador validados.');

  if (!process.env.PLAYWRIGHT_MODULE) return;
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
  const navegador = await chromium.launch({ executablePath: process.env.CHROME_EXECUTAVEL, args: ['--no-sandbox'] });
  try {
    const pagina = await navegador.newPage();
    await pagina.setContent('<div id="area" style="height:300px;overflow:auto"><div id="conteudo">' +
      '<div style="height:1200px">Histórico</div><img id="imagem" style="display:block;width:200px;height:auto" /></div></div>');
    const compilado = ts.transpileModule(fs.readFileSync('src/service/RolagemConversa.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText;
    await pagina.addScriptTag({ content: 'window.exports = {};\n' + compilado });
    await pagina.evaluate(() => {
      window.segue = true;
      const area = document.querySelector('#area');
      area.addEventListener('scroll', () => { window.segue = area.scrollHeight - area.scrollTop - area.clientHeight < 80; });
      window.limpar = window.exports.observarFimDaConversa(area, document.querySelector('#conteudo'), () => window.segue);
    });
    const noFim = () => pagina.waitForFunction(() => {
      const area = document.querySelector('#area');
      return Math.abs(area.scrollHeight - area.scrollTop - area.clientHeight) <= 1;
    });
    await noFim();
    const imagem = altura => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="${altura}"><rect width="200" height="${altura}" fill="blue"/></svg>`);
    await pagina.locator('#imagem').evaluate((el, src) => { el.src = src; }, imagem(800));
    await pagina.waitForFunction(() => document.querySelector('#imagem').naturalHeight === 800);
    await noFim();
    await pagina.evaluate(() => { document.querySelector('#area').scrollTop = 100; });
    await pagina.waitForFunction(() => !window.segue);
    await pagina.locator('#imagem').evaluate((el, src) => { el.src = src; }, imagem(1500));
    await pagina.waitForFunction(() => document.querySelector('#imagem').naturalHeight === 1500);
    await pagina.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await pagina.locator('#area').evaluate(el => el.scrollTop), 100);
    await pagina.locator('#area').evaluate(el => { el.scrollTop = el.scrollHeight; });
    await pagina.waitForFunction(() => window.segue);
    await pagina.locator('#area').evaluate(el => { el.style.height = '200px'; });
    await noFim();
    await pagina.evaluate(() => window.limpar());
    console.log('Chrome: abertura no fim, imagem tardia, redução da área e leitura de mensagens antigas preservadas.');
  } finally { await navegador.close(); }
})().catch(erro => { console.error(erro); process.exitCode = 1; });
