/**
 * Compila os temas a partir do SCSS do Apollo.
 *
 * Gera `public/theme/gerados/<modo>/<cor>/theme.css` — um CSS completo por
 * combinação, como fazem os temas oficiais do PrimeReact. São 24 arquivos de
 * ~220 KB; só um é carregado por vez, pelo `<link id="theme-link">`.
 *
 * ⚠️ **Os CSS gerados não vão para o git** (ver `.gitignore`): são derivados,
 * pesam ~5 MB somados e conflitariam a cada merge. O build os produz — daí este
 * script rodar no `prebuild`.
 *
 * O mecanismo é o `!default` do Sass: todas as variáveis do tema Apollo estão
 * declaradas com ele, então basta defini-las **antes** do `@import` para
 * sobrescrever. Nada do tema original precisa ser tocado.
 *
 *     npm run build:temas
 *     npm run build:temas -- --so=claro/verde     (uma combinação, para testar)
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as sass from 'sass';

import { CORES, MODOS } from './temas.config.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ_TEMA = join(AQUI, '..', 'public', 'theme');
const DESTINO = join(RAIZ_TEMA, 'gerados');

/**
 * Monta o SCSS de uma combinação.
 *
 * A ordem importa: variáveis primeiro, `@import` depois. Invertendo, o
 * `!default` do arquivo original vence e nada muda.
 */
const montaScss = (cor, modo) => {
  const claro = modo.id === 'claro';
  const paleta = claro ? cor.claro : cor.escuro;
  const rgb = hexParaRgb(paleta.primary);

  // ⚠️ **A assinatura difere entre os modos**, e é o que os `_variables`
  // oficiais esperam: o claro pede `$primaryDark/DarkerColor` (tons mais
  // fundos, para texto e realce sobre fundo branco); os escuros pedem
  // `$primaryLighter/LightestColor` (tons mais claros e um véu translúcido,
  // para brilhar sobre fundo escuro). Mandar os do claro para o dark deixa
  // `$primaryLightestColor` indefinida e a compilação falha.
  const especificas = claro
    ? `$primaryLightColor: ${paleta.light};
$primaryDarkColor: ${paleta.dark ?? `scale-color(${paleta.primary}, $lightness: -5%)`};
$primaryDarkerColor: ${paleta.darker ?? `scale-color(${paleta.primary}, $lightness: -10%)`};`
    : `$primaryLightColor: ${paleta.light};
$primaryLighterColor: ${paleta.lighter};
$primaryLightestColor: rgba(${rgb}, 0.2);`;

  // No claro o texto sobre a cor é branco; nos escuros a primária é clara, e o
  // texto sobre ela precisa ser escuro para ter contraste.
  const textoSobrePrimaria = claro ? '#ffffff' : '#030712';

  // O `highlight` do claro é um pastel escolhido a dedo por cor, não um
  // clareamento da primária - calcular dava perto, mas não igual.
  const highlightBg = claro ? (paleta.highlight ?? `rgba(${rgb}, 0.12)`) : `rgba(${rgb}, 0.16)`;
  const highlightTexto = claro
    ? (paleta.darker ?? `scale-color(${paleta.primary}, $lightness: -10%)`)
    : 'rgba(255, 255, 255, 0.87)';

  return `// GERADO POR scripts/build-temas.mjs - NÃO EDITE
// Tema: ${cor.rotulo} (${cor.id}) · Modo: ${modo.rotulo} (${modo.id})

$primaryColor: ${paleta.primary};
${especificas}
$primaryTextColor: ${textoSobrePrimaria};

$highlightBg: ${highlightBg};
$highlightTextColor: ${highlightTexto};
$highlightFocusBg: rgba(${rgb}, 0.24);

// O \`_variables\` de cada modo traz as shades, o \`:root\` inteiro e o
// \`color-scheme\` - são os arquivos oficiais do template, não um mapa
// reconstruído por nós.
@import "../../../modos/${modo.pasta}/_variables";
@import "../../../_fonts";
@import "../../../theme-base/_components";
@import "../../../modos/${modo.pasta}/_extensions";
`;
};

/** `#ff8800` → `255, 136, 0`, para montar `rgba()` no SCSS. */
const hexParaRgb = (hex) => {
  const limpo = hex.replace('#', '');
  const n = parseInt(
    limpo.length === 3
      ? limpo
          .split('')
          .map((c) => c + c)
          .join('')
      : limpo,
    16,
  );
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

const filtro = process.argv.find((a) => a.startsWith('--so='))?.slice(5);

const gerar = async () => {
  const modos = Object.values(MODOS);
  const combinacoes = modos.flatMap((modo) => CORES.map((cor) => ({ cor, modo })));

  const alvo = filtro
    ? combinacoes.filter(({ cor, modo }) => `${modo.id}/${cor.id}` === filtro)
    : combinacoes;

  if (!alvo.length) {
    console.error(`Nenhuma combinação casa com "${filtro}".`);
    console.error(`Exemplos: ${combinacoes.slice(0, 3).map((c) => `${c.modo.id}/${c.cor.id}`).join(', ')}`);
    process.exit(1);
  }

  // Só limpa tudo numa geração completa: com `--so=`, apagar levaria junto as
  // outras 23 e o sistema ficaria sem tema.
  if (!filtro) await rm(DESTINO, { recursive: true, force: true });

  const inicio = Date.now();

  for (const { cor, modo } of alvo) {
    const pasta = join(DESTINO, modo.id, cor.id);
    await mkdir(pasta, { recursive: true });

    const entrada = join(pasta, 'theme.scss');
    await writeFile(entrada, montaScss(cor, modo), 'utf8');

    const { css } = sass.compile(entrada, {
      style: 'compressed',
      loadPaths: [RAIZ_TEMA],
      // O tema do Apollo usa `@import`, que o Dart Sass deprecou; o aviso
      // apareceria 24 vezes e não há o que fazer sem reescrever o template.
      silenceDeprecations: ['import', 'global-builtin', 'color-functions'],
    });

    await writeFile(join(pasta, 'theme.css'), css, 'utf8');
    // O .scss serve para conferir o que gerou; o browser só lê o .css.
    console.log(`  ${modo.id}/${cor.id}`);
  }

  console.log(`\n${alvo.length} tema(s) em ${((Date.now() - inicio) / 1000).toFixed(1)}s.`);
};

gerar().catch((erro) => {
  console.error('Falha ao gerar os temas:', erro.message);
  process.exit(1);
});
