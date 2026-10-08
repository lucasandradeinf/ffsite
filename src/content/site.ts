/**
 * Textos institucionais e contatos. Campos vazios ('') simplesmente
 * não aparecem no site — preencha quando tiver as informações.
 */
export const site = {
  brand: 'Francefarma',
  brandFull: 'Francefarma Cosméticos',

  hero: {
    eyebrow: 'Indústria de cosméticos',
    // A parte entre *asteriscos* aparece em itálico serifado.
    headline: 'Do sol da manhã ao cuidado *da noite.*',
    sub: 'Cosméticos para cuidar da pele, do cabelo e do bem-estar de toda a família. Da proteção solar à hidratação, beleza e saúde em cada fórmula.',
    cta: 'Conheça os produtos',
  },

  orbit: {
    eyebrow: 'Nossos produtos',
    hint: 'Role para girar',
  },

  manifesto: {
    eyebrow: 'Sobre a Francefarma',
    text: 'Beleza é cuidar da pele *todos os dias.* Do protetor que acompanha o verão à loção que encerra a noite, cada cosmético Francefarma nasce para unir saúde, bem-estar e prazer de usar.',
    body: [
      'Somos uma indústria de cosméticos dedicada ao cuidado da pele, do cabelo e do corpo — proteção solar, hidratação, cuidados infantis e bem-estar para toda a família.',
      'Substitua este parágrafo pela história da Francefarma: fundação, fábrica, valores e o que torna a marca única.',
    ],
  },

  categories: {
    eyebrow: 'Linhas',
    title: 'Um cuidado para cada *pele.*',
  },

  cta: {
    eyebrow: 'Fale com a Francefarma',
    title: 'Conheça nossos *produtos.*',
    text: 'Revendedores, distribuidores e parceiros: conheça o portfólio completo de cosméticos Francefarma.',
    button: 'Entrar em contato',
  },

  contact: {
    email: '',      // ex.: 'contato@empresa.com.br'
    phone: '',      // ex.: '+55 11 0000-0000'
    whatsapp: '',   // só números, ex.: '5511900000000'
    address: '',
  },

  social: [
    // { label: 'Instagram', url: 'https://instagram.com/...' },
  ] as { label: string; url: string }[],
};
