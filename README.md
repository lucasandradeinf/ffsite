# Francefarma — site institucional

Publicado em **https://lucasandradeinf.github.io/ffsite/** (vitrine 360°). A versão alternativa da órbita fica em `/orbita/`.

Cada push na branch `main` publica o site automaticamente pelo GitHub Actions (`.github/workflows/deploy.yml`).

React + TypeScript + Vite. Sem bibliotecas de animação: a órbita roda em um único `requestAnimationFrame` usando só `transform`, `opacity` e `filter`.

## Rodar

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # gera /dist para publicar
```

## Produtos

1. Coloque o PNG com **fundo transparente** em `public/products/`.
   Ele aparece no site na hora, com o nome tirado do arquivo.
2. Rode `npm run images` para recortar as bordas e gerar a versão `.webp` (bem mais leve).
3. (Opcional) Edite `src/content/products.ts` para definir nome, categoria, descrição, cor de destaque e ordem.

Para remover um produto: apague o arquivo ou use `hidden: true`.

## Textos e contatos

Tudo em `src/content/site.ts`. E-mail, telefone, WhatsApp, endereço e redes sociais só aparecem quando preenchidos.

## Arquivos

- `public/logo.png` / `public/logo-light.png`: logo com fundo transparente (versão escura e clara)
- `public/mark.svg`: símbolo da marca (favicon)
- `_originais/`: fotos e logo originais, sem tratamento

## Versão 360° (página inicial)

a esteira abre o site e cada produto gira 360° com o scroll (frente e verso).

- O 3D é gerado a partir do próprio PNG: o contorno da embalagem vira um sólido de revolução, a foto vira a frente e o verso é desenhado automaticamente.
- O **rótulo de trás** usa o campo `back` em `src/content/products.ts` (`title`, `composition`, `claims`, `usage`).
  Os dados atuais vieram dos rótulos originais — substitua pela composição oficial (INCI) e pelo modo de uso de cada produto.
- `depth` controla a profundidade da embalagem (1 = redonda, 0.6 = achatada).
- Sem WebGL, o site mostra automaticamente a versão da órbita.
