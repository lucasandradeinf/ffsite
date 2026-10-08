import { Fragment, type CSSProperties, type ReactNode } from 'react';
import type { Product } from './products';

/** "Texto com *ênfase*" → texto com <em>ênfase</em> (serifada, itálica). */
export function Emph({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*[^*]+\*)/g).map((part, i) =>
        part.startsWith('*') ? <em key={i}>{part.slice(1, -1)}</em> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}

/** Divide em palavras (mantendo a ênfase) para animações palavra a palavra. */
export function words(text: string): { word: string; em: boolean }[] {
  return text
    .split(/(\*[^*]+\*)/g)
    .filter(Boolean)
    .flatMap((part) => {
      const em = part.startsWith('*');
      return (em ? part.slice(1, -1) : part).split(/\s+/).filter(Boolean).map((word) => ({ word, em }));
    });
}

type ImgProps = {
  product: Product;
  className?: string;
  eager?: boolean;
  priority?: boolean;
  alt?: string;
  style?: CSSProperties;
};

export function ProductImage({ product, className, eager, priority, alt, style }: ImgProps) {
  return (
    <picture className={className} style={style}>
      {product.webp && <source srcSet={product.webp} type="image/webp" />}
      <img
        src={product.src}
        alt={alt ?? product.name}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        {...(priority ? { fetchpriority: 'high' } : {})}
      />
    </picture>
  );
}

export function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 1.5h20a10 9 0 0 1-20 0z" fill="var(--mark-top, #0B4A82)" />
      <path d="M2 22.5a10 9 0 0 1 20 0z" fill="var(--mark-bottom, #7A1222)" />
    </svg>
  );
}

export const pad = (n: number) => String(n).padStart(2, '0');

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`eyebrow ${className}`}>
      <span className="eyebrow__line" aria-hidden="true" />
      {children}
    </p>
  );
}
