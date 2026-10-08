/**
 * npm run images
 * Para cada PNG em /public/products: recorta bordas transparentes,
 * limita a altura a 1400px e gera uma versão .webp (muito mais leve).
 * O site usa o .webp automaticamente quando ele existe.
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('public/products');
const MAX_H = 1400;

for (const f of fs.readdirSync(dir)) {
  if (!/\.png$/i.test(f)) continue;
  const src = path.join(dir, f);
  const base = f.replace(/\.png$/i, '');
  const meta = await sharp(src).metadata();
  if (!meta.hasAlpha) console.warn(`⚠  ${f} não tem transparência — use um PNG com fundo removido.`);

  const buf = await sharp(src).trim({ threshold: 1 }).resize({ height: MAX_H, withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(src, buf);
  await sharp(buf).webp({ quality: 86, alphaQuality: 95 }).toFile(path.join(dir, base + '.webp'));
  const m = await sharp(buf).metadata();
  console.log(`✓ ${base}  ${m.width}×${m.height}`);
}
