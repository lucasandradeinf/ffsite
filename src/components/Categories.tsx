import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { categories, products } from '../lib/products';
import { site } from '../content/site';
import { Emph, Eyebrow, ProductImage, pad, prefersReducedMotion } from '../lib/ui';

/** Leva a órbita até o produto (ouvido em ProductOrbit). */
export const goToProduct = (index: number) => window.dispatchEvent(new CustomEvent('orbit:goto', { detail: index }));

export function Categories() {
  const [hover, setHover] = useState<number | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Prévia que segue o cursor (apenas mouse).
  useEffect(() => {
    if (prefersReducedMotion() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const el = previewRef.current!;
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dx = tx - x, dy = ty - y;
      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return;
      x += dx * 0.14;
      y += dy * 0.14;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${(dx * 0.03).toFixed(2)}deg)`;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <section className="lines" id="linhas" data-nav="light">
      <div className="container">
        <div className="lines__head">
          <Eyebrow className="reveal">{site.categories.eyebrow}</Eyebrow>
          <h2 className="section-title reveal">
            <Emph text={site.categories.title} />
          </h2>
        </div>

        <ul className="lines__list" onPointerLeave={() => setHover(null)}>
          {categories.map((c, i) => (
            <li key={c.name} className="lines__row reveal" style={{ '--d': `${i * 0.06}s` } as CSSProperties}>
              <button
                type="button"
                className="lines__button"
                onPointerEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => goToProduct(products.indexOf(c.items[0]))}
              >
                <span className="lines__index">{pad(i + 1)}</span>
                <span className="lines__name">{c.name}</span>
                <span className="lines__brands">{[...new Set(c.items.map((p) => p.brand ?? p.name))].join(' · ')}</span>
                <span className="lines__count">{pad(c.items.length)}</span>
                <span className="lines__thumbs" aria-hidden="true">
                  {c.items.slice(0, 3).map((p) => (
                    <ProductImage key={p.id} product={p} alt="" />
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="lines__preview" ref={previewRef} aria-hidden="true">
        {categories.map((c, i) => (
          <div key={c.name} className={`lines__preview-set ${hover === i ? 'is-on' : ''}`}>
            {c.items.slice(0, 3).map((p, j, arr) => (
              <ProductImage
                key={p.id}
                product={p}
                alt=""
                className="lines__preview-img"
                style={{ '--k': j - (arr.length - 1) / 2 } as CSSProperties}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
