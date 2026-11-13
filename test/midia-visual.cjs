// Executar em front/: node test/midia-visual.cjs
const assert = require('node:assert/strict');
const { carregar } = require('./selecao-atendimentos.cjs');

function preparar(tipo, extras = {}) {
  const estados = [];
  let indice = 0, reproducoes = 0;
  const Componente = carregar('src/app/(main)/chat/[[...id]]/_ChatSection/_components/MidiaVisual.tsx', {
    react: { useState: inicial => {
      const atual = indice++;
      if (!(atual in estados)) estados[atual] = inicial;
      return [estados[atual], valor => { estados[atual] = typeof valor === 'function' ? valor(estados[atual]) : valor; }];
    } },
    'primereact/image': { Image: 'Image' },
    'primereact/progressspinner': { ProgressSpinner: 'Spinner' },
    './VideoGif': { default: 'VideoGif' },
    './VisualizadorImagem': { default: 'VisualizadorImagem' },
  }).default;
  let arvore;
  function renderizar() {
    indice = 0;
    arvore = Componente({ src: 'https://storage/teste', tipo, onAbrirVideo: () => reproducoes++, onBaixar() {}, ...extras });
  }
  function elementos(no, resultado = []) {
    if (arguments.length === 0) no = arvore;
    if (Array.isArray(no)) { no.forEach(filho => elementos(filho, resultado)); return resultado; }
    if (!no?.props) return resultado;
    resultado.push(no); elementos(no.props.children, resultado); return resultado;
  }
  renderizar();
  return { renderizar, elementos, raiz: () => arvore, reproducoes: () => reproducoes };
}

for (const tipo of ['image', 'video']) {
  const t = preparar(tipo);
  assert.equal(t.raiz().props['aria-busy'], true);
  assert.equal(t.raiz().props.style.width, 'min(250px, 60vw)');
  assert.ok(t.elementos().some(no => no.props.role === 'status'));
  const midia = () => t.elementos().find(no => no.type === (tipo === 'image' ? 'img' : 'video'));
  if (tipo === 'image') {
    midia().props.onLoad();
  } else {
    assert.ok(!t.elementos().some(no => no.props['aria-label'] === 'Reproduzir vídeo'));
    midia().props.onLoadedMetadata({ currentTarget: { videoWidth: 720, videoHeight: 1280 } });
    midia().props.onLoadedData();
  }
  t.renderizar();
  assert.equal(t.raiz().props['aria-busy'], false);
  assert.ok(!t.elementos().some(no => no.props.role === 'status'));
  if (tipo === 'video') {
    assert.equal(t.raiz().props.style.aspectRatio, 720 / 1280);
    t.elementos().find(no => no.props['aria-label'] === 'Reproduzir vídeo').props.onClick();
    assert.equal(t.reproducoes(), 1);
  }

  midia().props.onError();
  t.renderizar();
  assert.ok(t.elementos().some(no => no.props.role === 'alert'));
  assert.ok(!t.elementos().some(no => no.props.role === 'status'));
  t.elementos().find(no => no.type === 'button' && no.props.children === 'Tentar novamente').props.onClick();
  t.renderizar();
  assert.equal(t.raiz().props['aria-busy'], true);
  assert.equal(midia().key, '1');
}

const gif = preparar('video', { gif: true });
assert.equal(gif.raiz().props.style.width, 'min(380px, 60vw)');
gif.elementos().find(no => no.type === 'VideoGif').props.onLoadedData();
gif.renderizar();
assert.equal(gif.raiz().props['aria-busy'], false);
assert.ok(!gif.elementos().some(no => no.props['aria-label'] === 'Reproduzir vídeo'));
const upload = preparar('image', { enviando: true });
assert.ok(!upload.elementos().some(no => no.props.role === 'status'), 'Upload mantém seu indicador próprio');
console.log('Imagem/vídeo validados: espaço reservado, carregamento, metadados, reprodução, falha, nova tentativa e GIF.');
