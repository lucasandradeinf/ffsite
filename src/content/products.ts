/**
 * ─────────────────────────────────────────────────────────────
 *  PRODUTOS — edite apenas este arquivo.
 * ─────────────────────────────────────────────────────────────
 *
 *  • Para ADICIONAR um produto: coloque o PNG (fundo transparente) em
 *    /public/products. Ele já aparece no site automaticamente, com o nome
 *    gerado a partir do arquivo. Depois, se quiser, adicione uma entrada
 *    aqui para definir nome, descrição etc.
 *  • Para REMOVER: apague o arquivo da pasta, ou use `hidden: true`.
 *  • A ORDEM do site é a ordem desta lista. Produtos sem entrada aqui
 *    entram no final.
 *  • Rode `npm run images` para gerar as versões .webp otimizadas.
 *
 *  Os textos abaixo foram retirados dos rótulos das embalagens.
 *  Nenhuma informação técnica foi inventada — revise e complete à vontade.
 */

export type ProductConfig = {
  /** Caminho da imagem em /public. Ex.: "/products/meu-produto.png" */
  image: string;
  name: string;
  /** Marca / linha do produto */
  brand?: string;
  category?: string;
  description?: string;
  /** Volume / peso. Ex.: "120 mL" */
  size?: string;
  /** Destaques curtos (aparecem como uma linha discreta) */
  highlights?: string[];
  link?: string;
  /** Cor da luz ambiente quando o produto está em destaque */
  accent?: string;
  /** Ajuste fino do tamanho visual (1 = padrão) */
  scale?: number;
  /** Profundidade da embalagem no 360° (1 = redonda, 0.6 = achatada/oval) */
  depth?: number;
  /** Conteúdo do rótulo de trás, desenhado no verso do produto 3D */
  back?: {
    /** Linha de título do verso (ex.: tipo do produto) */
    title?: string;
    /** Composição / ativos */
    composition?: string[];
    /** Selos e alegações ("Sem parabenos"...) */
    claims?: string[];
    /** Modo de uso — preencha com o texto oficial do rótulo */
    usage?: string;
  };
  hidden?: boolean;
};

export const products: ProductConfig[] = [
  {
    image: '/products/sunbrisa-sensitive-fps30.png',
    name: 'Sunbrisa Sensitive FPS 30',
    brand: 'Sunbrisa',
    category: 'Proteção Solar',
    description: 'Protetor solar hipoalergênico para corpo e rosto. Fórmula leve, oil free e de secagem rápida, com vitamina E.',
    size: '120 mL',
    highlights: ['UVA + UVB', 'Oil free', 'Dermatologicamente testado'],
    link: '#contato',
    accent: '#f2b705',
    scale: 1,
    depth: 0.62,
    back: {
      title: 'Protetor solar hipoalergênico · Corpo e rosto',
      composition: ['Vitamina E'],
      claims: ['Proteção UVA + UVB', 'Fórmula leve', 'Oil free', 'Secagem rápida', 'Sem perfume, parabenos e silicones', 'Dermatologicamente testado'],
    },
  },
  {
    image: '/products/sunbrisa-bronzeador-fps6.png',
    name: 'Sunbrisa Óleo Bronzeador FPS 6',
    brand: 'Sunbrisa',
    category: 'Proteção Solar',
    description: 'Óleo bronzeador de cenoura com vitamina E, para um bronzeado duradouro.',
    size: '120 mL',
    highlights: ['Cenoura', 'Vitamina E', 'Testado dermatologicamente'],
    link: '#contato',
    accent: '#d98a1c',
    scale: 1.02,
    depth: 1,
    back: {
      title: 'Óleo bronzeador FPS 6',
      composition: ['Cenoura', 'Vitamina E'],
      claims: ['Proteção UVA + UVB', 'Bronzeado duradouro', 'Testado dermatologicamente'],
    },
  },
  {
    image: '/products/vidalia-night.png',
    name: 'Vidália Night',
    brand: 'Vidália',
    category: 'Corpo & Hidratação',
    description: 'Loção desodorante hidratante corporal com alto poder de hidratação. Textura leve e de rápida absorção.',
    size: '425 g',
    highlights: ['Sem parabenos', 'Cruelty free'],
    link: '#contato',
    accent: '#c9a24a',
    scale: 1.06,
    depth: 0.82,
    back: {
      title: 'Loção desodorante hidratante corporal',
      // lista impressa na lateral do rótulo original
      composition: ['Óleo de Amêndoas', 'Óleo de Argan', 'Extrato de Aveia', 'Extrato de Camomila', 'Extrato de Algas', 'Pantenol (Pró-vitamina B5)', 'Colágeno', 'Elastina', 'Vitamina E'],
      claims: ['Sem parabenos', 'Sem petrolatos', 'Sem corantes', 'Sem silicones', 'Sem óleo mineral', 'Dermatologicamente testado', 'Não testado em animais'],
    },
  },
  {
    image: '/products/moph-derme.png',
    name: 'Moph Derme',
    brand: 'Moph Derme',
    category: 'Corpo & Hidratação',
    description: 'Loção oleosa de hidratação intensa para peles ressecadas. A.G.E./TCM, vitaminas A e E e óleo de girassol.',
    size: '100 mL',
    highlights: ['Vitaminas A e E', 'Óleo de girassol'],
    link: '#contato',
    accent: '#f4c430',
    scale: 0.92,
    depth: 1,
    back: {
      title: 'Loção oleosa · Hidratação intensa',
      composition: ['A.G.E. / TCM', 'Vitamina A', 'Vitamina E', 'Óleo de Girassol'],
      claims: ['Para peles ressecadas'],
    },
  },
  {
    image: '/products/repmax-family.png',
    name: 'Repmax Family',
    brand: 'Repmax',
    category: 'Repelentes',
    description: 'Spray repelente de insetos com extrato de aloe vera, para toda a família e crianças acima de 2 anos.',
    size: '200 mL',
    highlights: ['Não oleoso', 'Aloe vera', 'Dermatologicamente testado'],
    link: '#contato',
    accent: '#f07a1a',
    scale: 1,
    depth: 0.72,
    back: {
      title: 'Spray repelente de insetos',
      composition: ['Extrato de Aloe vera'],
      claims: ['Até 6h de proteção', 'Não oleoso', 'Dermatologicamente testado', 'Para toda a família e crianças acima de 2 anos'],
    },
  },
  {
    image: '/products/ta-na-hora-shampoo.png',
    name: 'Tá na Hora Shampoo',
    brand: 'Tá na Hora',
    category: 'Cuidado Infantil',
    description: 'Shampoo infantil para todos os tipos de cabelo, com D-pantenol e extrato de camomila.',
    size: '350 mL',
    highlights: ['Não irrita os olhos', 'Sem corantes', 'Sem parabenos'],
    link: '#contato',
    accent: '#f26a1b',
    scale: 0.94,
    depth: 0.6,
    back: {
      title: 'Shampoo infantil · Todos os tipos de cabelo',
      composition: ['D-Pantenol', 'Extrato de Camomila'],
      claims: ['Não irrita os olhos', 'Sem corantes', 'Sem parabenos', 'Dermatologicamente testado'],
    },
  },
  {
    image: '/products/ta-na-hora-condicionador.png',
    name: 'Tá na Hora Condicionador',
    brand: 'Tá na Hora',
    category: 'Cuidado Infantil',
    description: 'Condicionador infantil que deixa os cabelos macios e fáceis de desembaraçar. Com D-pantenol e extrato de camomila.',
    size: '350 g',
    highlights: ['Sem corantes', 'Sem parabenos'],
    link: '#contato',
    accent: '#ff8a2a',
    scale: 0.94,
    depth: 0.6,
    back: {
      title: 'Condicionador infantil · Todos os tipos de cabelo',
      composition: ['D-Pantenol', 'Extrato de Camomila'],
      claims: ['Cabelos macios e fáceis de desembaraçar', 'Sem corantes', 'Sem parabenos'],
    },
  },
];
