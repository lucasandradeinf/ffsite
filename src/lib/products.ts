import files from 'virtual:product-files';
import { products as config, type ProductConfig } from '../content/products';
import { asset } from './asset';

export type Product = Required<Pick<ProductConfig, 'name' | 'category' | 'description' | 'link' | 'accent'>> &
  ProductConfig & {
    id: string;
    /** imagem de fallback (PNG) */
    src: string;
    /** versão otimizada, quando existir */
    webp?: string;
    scale: number;
  };

const DEFAULT_ACCENT = '#7aa2e0';

const baseOf = (image: string) => image.split('/').pop()!.replace(/\.(png|webp|avif|jpe?g)$/i, '');

const titleize = (base: string) =>
  base
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

function build(c: ProductConfig): Product {
  const base = baseOf(c.image);
  const found = files.find((f) => f.base === base);
  const exts = found?.exts ?? [];
  const primary = exts.find((e) => e === 'png') ?? exts.find((e) => e !== 'webp') ?? 'webp';
  return {
    ...c,
    id: base,
    src: asset(found ? `/products/${base}.${primary}` : c.image),
    webp: exts.includes('webp') && primary !== 'webp' ? asset(`/products/${base}.webp`) : undefined,
    category: c.category ?? 'Produtos',
    description: c.description ?? '',
    link: c.link ?? '#contato',
    accent: c.accent ?? DEFAULT_ACCENT,
    scale: c.scale ?? 1,
  };
}

const configured = new Set(config.map((c) => baseOf(c.image)));

/** Arquivos na pasta sem entrada na configuração entram automaticamente. */
const discovered: ProductConfig[] = files
  .filter((f) => !configured.has(f.base))
  .map((f) => ({ image: `/products/${f.base}.${f.exts[0]}`, name: titleize(f.base) }));

const fileExists = (c: ProductConfig) => files.some((f) => f.base === baseOf(c.image));

export const products: Product[] = [...config.filter(fileExists), ...discovered]
  .filter((c) => !c.hidden)
  .map(build);

export const categories = (() => {
  const map = new Map<string, Product[]>();
  for (const p of products) map.set(p.category, [...(map.get(p.category) ?? []), p]);
  return [...map].map(([name, items]) => ({ name, items }));
})();

export const brands = [...new Set(products.map((p) => p.brand ?? p.name))];
