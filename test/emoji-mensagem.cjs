// node test/emoji-mensagem.cjs
const assert = require('node:assert/strict');
const { carregar } = require('./selecao-atendimentos.cjs');
const { lerEmojiUnico } = carregar('src/service/EmojiUnico.ts');

(async () => {
  for (const emoji of ['😁', '👍🏽', '👨‍👩‍👧‍👦', '🇧🇷', '1️⃣', '❤️', '👩‍💻']) {
    assert.equal(lerEmojiUnico({ content: emoji, type: 'chat' }).emoji, emoji);
  }
  for (const content of ['a', '1', 'ok 😁', '😁😁', '', ':)']) {
    assert.equal(lerEmojiUnico({ content, type: 'chat' }), null);
  }
  assert.deepEqual(lerEmojiUnico({ content: '*Douglas:*\n😁', type: 'chat', from_me: true }),
    { emoji: '😁', assinatura: '*Douglas:*' });
  assert.equal(lerEmojiUnico({ content: '😁', type: 'image', has_media: true }), null);
  console.log('Emoji único validado: família, bandeira, tom de pele, assinatura e exclusão de texto/mídia.');

  if (!process.env.PLAYWRIGHT_MODULE) return;
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
  const fs = require('node:fs');
  const css = require('sass').compile('src/styles/layout/_utils.scss').css;
  const primeflex = fs.readFileSync(require.resolve('primeflex/primeflex.css'), 'utf8');
  const navegador = await chromium.launch({ executablePath: process.env.CHROME_EXECUTAVEL, args: ['--no-sandbox'] });
  try {
    const pagina = await navegador.newPage();
    for (const { emoji, texto } of [{ emoji: false, texto: 'a' }, { emoji: true, texto: '😁' },
      { emoji: false, texto: 'Mensagem longa para conferir texto, data e horário no mesmo balão. '.repeat(5) }]) {
      await pagina.setContent(`<style>${primeflex}\n${css}\nhtml{font-size:14px}</style>
        <div class="message-balloon relative w-fit" style="max-width:350px">
          <div id="balao" class="mensagem-balao-texto border-1 border-round-lg" style="background:#123352">
            <div class="mensagem-conteudo-texto"><span id="texto" ${emoji ? 'class="mensagem-emoji-unico"' : ''}>${texto}</span></div>
            <div style="text-align:right;font-size:12px"><span id="horario">00:01 ✓</span></div>
          </div>
          <div class="message-chevron hidden absolute right-0 top-0 mt-2 mr-2">
            <button style="width:1.5rem;height:1.5rem;padding:0">⌄</button>
          </div>
        </div>`);
      await pagina.hover('.message-balloon');
      const resultado = await pagina.evaluate(() => {
        const texto = document.querySelector('#texto'), botao = document.querySelector('button');
        const t = texto.getBoundingClientRect(), b = botao.getBoundingClientRect();
        return { sobrepoe: t.left < b.right && t.right > b.left && t.top < b.bottom && t.bottom > b.top,
          tamanho: parseFloat(getComputedStyle(texto).fontSize),
          margemHorario: document.querySelector('#balao').getBoundingClientRect().right - document.querySelector('#horario').getBoundingClientRect().right };
      });
      assert.equal(resultado.sobrepoe, false);
      if (emoji) assert.equal(resultado.tamanho, 42);
      assert.ok(resultado.margemHorario <= 9, 'O espaço do menu não afasta o horário do canto');
    }
    console.log('Chrome: chevron não cobre letra nem emoji único; balão e horário preservados.');
  } finally { await navegador.close(); }
})().catch(erro => { console.error(erro); process.exitCode = 1; });
