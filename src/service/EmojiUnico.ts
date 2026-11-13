const pictograma = new RegExp('[\\p{Extended_Pictographic}\\p{Regional_Indicator}]', 'u');
const teclaEmoji = new RegExp('^[#*0-9]\\uFE0F?\\u20E3$', 'u');

/** Conta caracteres visuais: família, bandeira e tom de pele podem ter vários códigos Unicode. */
export function lerEmojiUnico(mensagem: { content: string; from_me?: boolean; has_media?: boolean; type: string }) {
  if (mensagem.has_media || !['chat', 'text'].includes(mensagem.type) || typeof Intl.Segmenter !== 'function') return null;
  let texto = (mensagem.content ?? '').trim();
  let assinatura = '';
  if (mensagem.from_me) {
    const prefixo = texto.match(/^\*[^*\r\n]+:\*\s*\r?\n/);
    if (prefixo) { assinatura = prefixo[0].trimEnd(); texto = texto.slice(prefixo[0].length).trim(); }
  }
  const partes = Array.from(new Intl.Segmenter('pt-BR', { granularity: 'grapheme' }).segment(texto));
  if (partes.length !== 1 || (!pictograma.test(texto) && !teclaEmoji.test(texto))) return null;
  return { emoji: texto, assinatura };
}
