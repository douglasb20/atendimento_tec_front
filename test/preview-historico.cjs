// Executar em front/: node test/preview-historico.cjs
const assert = require('node:assert/strict');
const { carregar } = require('./selecao-atendimentos.cjs');
const downloads = [];
let mostrarApagadas = false;
const Bolha = carregar('src/app/(main)/atendimentos/historico/_HistoricoAtendimentosSection/BolhaMensagemHistorico.tsx', {
  '@/hooks/useAjustesAtendimento': { useAjustesAtendimento: () => ({ ajustes: { mostrar_conteudo_mensagem_apagada: mostrarApagadas } }) },
  '@/service/Util': { DateToBR: valor => valor },
  '@/service/BaixarMidia': { baixarMidia: mensagem => downloads.push(mensagem) },
  '@/app/(main)/chat/[[...id]]/_ChatSection/_components/MidiaVisual': { default: 'MidiaVisual' },
  '@/app/(main)/chat/[[...id]]/_ChatSection/_components/PlayerAudio': { default: 'PlayerAudio' },
  '@/components/Interweave': { default: 'Interweave' },
}).default;
function elementos(no, itens = []) {
  if (Array.isArray(no)) { no.forEach(filho => elementos(filho, itens)); return itens; }
  if (!no?.props) return itens;
  itens.push(no); elementos(no.props.children, itens); return itens;
}
const mensagem = { id: '50', message_id: 'WA-HISTORICO', support_chat_id: '42',
  type: 'image', has_media: true, media_url: 'https://storage/foto.png', file_name: 'Foto.png', content: '', datetime: '2026-11-13T12:00:00Z' };
const preview = dados => elementos(Bolha({ message: dados })).find(no => no.type === 'MidiaVisual');
const imagem = preview(mensagem);
assert.ok(imagem);
assert.equal(imagem.props.src, mensagem.media_url);
assert.equal(imagem.props.tipo, 'image');
assert.equal(imagem.props.nome, 'Foto.png');
imagem.props.onBaixar();
assert.equal(downloads[0], mensagem, 'Download usa os IDs da mensagem do histórico');
assert.equal(preview({ ...mensagem, media_expired: true }), undefined);
assert.equal(preview({ ...mensagem, hidden_at: '2026-11-13' }), undefined);
assert.equal(preview({ ...mensagem, is_deleted: true }), undefined);
mostrarApagadas = true;
assert.ok(preview({ ...mensagem, is_deleted: true }));
assert.equal(preview({ ...mensagem, media_url: '' }), undefined);
assert.ok(elementos(Bolha({ message: { ...mensagem, type: 'ptt' } })).some(no => no.type === 'PlayerAudio'));
console.log('Histórico validado: visualizador compartilhado, download da mensagem correta, retenção, remoção e áudio preservados.');
