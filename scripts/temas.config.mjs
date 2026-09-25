/**
 * Catálogo dos temas: o que o gerador compila e o que a tela oferece.
 *
 * ⚠️ **Fonte única.** O `build-temas.mjs` lê daqui para gerar os CSS, e o front
 * lê daqui para montar os cards. Uma cor só no gerador vira arquivo que ninguém
 * escolhe; só na tela, vira card que aponta para um CSS inexistente.
 *
 * As paletas vêm dos temas oficiais do PrimeReact, iguais nos dois sistemas que
 * serviram de referência. Nos modos escuros a primária é **clareada** (o tom
 * 300 da escala) e o texto sobre ela fica escuro - o tom do modo claro sobre
 * fundo escuro não teria contraste.
 */

/**
 * Os modos. As cores de superfície não estão aqui: cada modo tem o
 * `_variables.scss` **oficial do template** em `public/theme/modos/<pasta>/`,
 * com as shades, o `:root` completo e o `color-scheme` já resolvidos.
 *
 * Os de `dim` e `dark` vieram do projeto nethive, que usa o mesmo Apollo - o
 * pacote deste projeto só trazia o claro. Reconstruí-los à mão custou um mapa
 * de shades invertido (o modal saía branco) e um parcial de remendo; os
 * arquivos oficiais dispensam os dois.
 */
export const MODOS = {
  claro: {
    id: 'claro',
    pasta: 'light',
    rotulo: 'Claro',
    descricao: 'Fundo branco, para ambientes bem iluminados',
  },
  escuro: {
    id: 'escuro',
    pasta: 'dark',
    rotulo: 'Escuro',
    descricao: 'Cinza neutro, o clássico modo noturno',
  },
  dim: {
    id: 'dim',
    pasta: 'dim',
    rotulo: 'Meia-luz',
    descricao: 'Escuro azulado, mais suave que o preto',
  },
};

/**
 * As cores, com as paletas **oficiais do Apollo** para cada modo.
 *
 * ⚠️ Não são calculadas: cada modo tem tons próprios escolhidos pelo autor do
 * template, e eles não seguem uma regra simples. Nos escuros a primária é o
 * tom 400 da escala (não o 300, que é o `light`), e o texto sobre ela é
 * `#030712`. Eu vinha derivando alguns por `scale-color`, e o resultado saía
 * perto mas não igual.
 *
 * Copiadas de `theme-{light,dim,dark}/<cor>/theme.scss` do nethive, que usa o
 * mesmo template. `dim` e `dark` compartilham a mesma paleta de cor - o que
 * muda entre eles são as superfícies, que vêm do `_variables` de cada modo.
 */
export const CORES = [
  {
    id: 'automatec',
    rotulo: 'Azul Automatec',
    descricao: 'A identidade da casa',
    // A única fora do pacote do template: é a cor da marca. Os tons escuros
    // seguem a mesma lógica das outras - primária clareada, véu a 20%.
    claro: {
      primary: '#262C9B',
      light: '#c7d2fe',
      dark: '#000459',
      darker: '#00034C',
      highlight: '#eef2ff',
    },
    escuro: { primary: '#8f95e8', light: '#b0b5ef', lighter: '#c7d2fe' },
  },
  {
    id: 'indigo',
    rotulo: 'Índigo',
    descricao: 'Azul-violeta sóbrio',
    claro: {
      primary: '#6366f1',
      light: '#c7d2fe',
      dark: '#4f46e5',
      darker: '#4338ca',
      highlight: '#eef2ff',
    },
    escuro: { primary: '#818cf8', light: '#a5b4fc', lighter: '#c7d2fe' },
  },
  {
    id: 'azul',
    rotulo: 'Azul Céu',
    descricao: 'Azul aberto e sereno',
    claro: {
      primary: '#3b82f6',
      light: '#bfdbfe',
      dark: '#2563eb',
      darker: '#1d4ed8',
      highlight: '#eff6ff',
    },
    escuro: { primary: '#60a5fa', light: '#93c5fd', lighter: '#bfdbfe' },
  },
  {
    id: 'ciano',
    rotulo: 'Ciano',
    descricao: 'Azul-petróleo refrescante',
    claro: {
      primary: '#06b6d4',
      light: '#a5f3fc',
      dark: '#0891b2',
      darker: '#0e7490',
      highlight: '#ecfeff',
    },
    escuro: { primary: '#22d3ee', light: '#67e8f9', lighter: '#a5f3fc' },
  },
  {
    id: 'verde',
    rotulo: 'Verde Floresta',
    descricao: 'Verde natural e tranquilo',
    claro: {
      primary: '#10b981',
      light: '#a7f3d0',
      dark: '#059669',
      darker: '#047857',
      highlight: '#f0fdfa',
    },
    escuro: { primary: '#34d399', light: '#6ee7b7', lighter: '#a7f3d0' },
  },
  {
    id: 'oceano',
    rotulo: 'Verde Oceano',
    descricao: 'Entre o verde e o azul',
    claro: {
      primary: '#14b8a6',
      light: '#99f6e4',
      dark: '#0d9488',
      darker: '#0f766e',
      highlight: '#f0fdfa',
    },
    escuro: { primary: '#2dd4bf', light: '#5eead4', lighter: '#99f6e4' },
  },
  {
    id: 'laranja',
    rotulo: 'Laranja Pôr do Sol',
    descricao: 'Quente e acolhedor',
    claro: {
      primary: '#f59e0b',
      light: '#fef08a',
      dark: '#d97706',
      darker: '#b45309',
      highlight: '#fffbeb',
    },
    escuro: { primary: '#fbbf24', light: '#fcd34d', lighter: '#fde68a' },
  },
  {
    id: 'roxo',
    rotulo: 'Roxo Noturno',
    descricao: 'Violeta elegante',
    claro: {
      primary: '#8b5cf6',
      light: '#ddd6fe',
      dark: '#7c3aed',
      darker: '#6d28d9',
      highlight: '#f5f3ff',
    },
    escuro: { primary: '#a78bfa', light: '#c4b5fd', lighter: '#ddd6fe' },
  },
  {
    id: 'rosa',
    rotulo: 'Rosa Pink',
    descricao: 'Vibrante e marcante',
    claro: {
      primary: '#ec4899',
      light: '#fbcfe8',
      dark: '#db2777',
      darker: '#be185d',
      highlight: '#fdf2f8',
    },
    escuro: { primary: '#f472b6', light: '#f9a8d4', lighter: '#fbcfe8' },
  },
];

/** `claro` é o padrão de quem nunca escolheu - é a cara atual do sistema. */
export const TEMA_PADRAO = { cor: 'automatec', modo: 'claro' };

/** O caminho que o `<link id="theme-link">` aponta. */
export const caminhoDoTema = (cor, modo) => `/theme/gerados/${modo}/${cor}/theme.css`;
