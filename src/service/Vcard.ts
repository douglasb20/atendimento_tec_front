/** Um número de telefone extraído de um cartão de contato compartilhado. */
export type TelefoneCompartilhado = {
  /** Só dígitos, já com DDI quando o cartão o traz (`waid` ou `+55...`). */
  digitos: string;
  /** Como veio no cartão, para exibir. */
  exibicao: string;
};

export type ContatoCompartilhado = {
  nome: string;
  telefones: TelefoneCompartilhado[];
};

/**
 * O conteúdo chega como JSON de uma lista de vCards (`["BEGIN:VCARD\n..."]`),
 * ou como um vCard cru. Qualquer coisa que não leia vira lista vazia: a bolha
 * cai de volta no texto, em vez de quebrar a conversa inteira.
 */
const extraiCartoes = (conteudo: string): string[] => {
  try {
    const dado = JSON.parse(conteudo);
    if (Array.isArray(dado)) return dado.filter((c): c is string => typeof c === 'string');
    if (typeof dado === 'string') return [dado];
  } catch {
    // Não era JSON: pode ser um vCard cru.
  }
  return conteudo.includes('BEGIN:VCARD') ? [conteudo] : [];
};

const valorDe = (linhas: string[], chave: RegExp): string | null => {
  const linha = linhas.find((l) => chave.test(l));
  if (!linha) return null;
  return linha.slice(linha.indexOf(':') + 1).trim() || null;
};

/** Lê os vCards de uma mensagem de contato. */
export const lerContatosCompartilhados = (conteudo: string): ContatoCompartilhado[] =>
  extraiCartoes(conteudo)
    .map((cartao) => {
      const linhas = cartao.split(/\r?\n/);

      const nome =
        valorDe(linhas, /^FN[;:]/i) ??
        valorDe(linhas, /^N[;:]/i)?.split(';').filter(Boolean).reverse().join(' ') ??
        'Contato';

      const telefones: TelefoneCompartilhado[] = [];
      const jaVistos = new Set<string>();

      linhas
        .filter((l) => /^(item\d+\.)?TEL[;:]/i.test(l))
        .forEach((linha) => {
          // `waid` é o número no formato do WhatsApp (com DDI); quando existe,
          // é mais confiável que o texto digitado pelo dono do contato.
          const waid = linha.match(/waid=(\d+)/i)?.[1];
          const exibicao = linha.slice(linha.lastIndexOf(':') + 1).trim();
          const digitos = waid ?? exibicao.replace(/\D/g, '');

          if (digitos.length < 8 || jaVistos.has(digitos)) return;
          jaVistos.add(digitos);
          telefones.push({ digitos, exibicao: exibicao || digitos });
        });

      return { nome, telefones };
    })
    .filter((contato) => contato.telefones.length > 0);

/**
 * Chave de comparação entre números: DDD + os 8 últimos dígitos.
 *
 * O WhatsApp omite o nono dígito de celulares de vários DDDs, então o mesmo
 * número aparece com 12 ou 13 dígitos conforme a origem. Comparar o texto
 * inteiro dá "contato não cadastrado" para quem já está cadastrado.
 */
export const chaveDoTelefone = (telefone?: string | null): string => {
  let digitos = (telefone ?? '').replace(/\D/g, '');
  if (digitos.startsWith('55') && digitos.length > 11) digitos = digitos.slice(2);
  if (digitos.length < 10) return digitos;
  return digitos.slice(0, 2) + digitos.slice(-8);
};

/**
 * Texto curto para prévias (lista de conversas, citação, notificação) de uma
 * mensagem de contato: o nome, ou "nome e mais N". `null` quando a mensagem não
 * é de contato ou o conteúdo não pôde ser lido - quem chama segue com o texto
 * que já usava.
 */
export const resumoDoContato = (tipo?: string, conteudo?: string | null): string | null => {
  if (tipo !== 'vcard' && tipo !== 'multi_vcard') return null;

  const contatos = lerContatosCompartilhados(conteudo ?? '');
  if (contatos.length === 0) return null;

  const resto = contatos.length - 1;
  return resto > 0 ? `${contatos[0].nome} e mais ${resto}` : contatos[0].nome;
};
