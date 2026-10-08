import { useEffect, useRef, type CSSProperties } from 'react';
import { products } from '../lib/products';
import { site } from '../content/site';
import { Emph, Eyebrow, ProductImage, prefersReducedMotion } from '../lib/ui';

export const contactHref = () => {
  const c = site.contact;
  if (c.whatsapp) return `https://wa.me/${c.whatsapp.replace(/\D/g, '')}`;
  if (c.email) return `mailto:${c.email}`;
  if (c.phone) return `tel:${c.phone.replace(/[^\d+]/g, '')}`;
  return '#contato';
};

/** Botão "magnético": acompanha levemente o cursor. */
function useMagnetic<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * 0.25;
      const y = (e.clientY - (r.top + r.height / 2)) * 0.35;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const leave = () => (el.style.transform = '');
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, []);
  return ref;
}

export function FinalCta() {
  const btn = useMagnetic<HTMLAnchorElement>();
  const n = products.length;
  const external = contactHref().startsWith('http');

  return (
    <section className="final" id="contato" data-nav="dark">
      <div className="final__ring" aria-hidden="true">
        {products.map((p, i) => (
          <div key={p.id} className="final__ring-item" style={{ '--a': `${(360 / n) * i}deg` } as CSSProperties}>
            <ProductImage product={p} alt="" />
          </div>
        ))}
      </div>

      <div className="final__content">
        <Eyebrow className="reveal eyebrow--light">{site.cta.eyebrow}</Eyebrow>
        <h2 className="final__title reveal">
          <Emph text={site.cta.title} />
        </h2>
        <p className="final__text reveal">{site.cta.text}</p>
        <a
          ref={btn}
          href={contactHref()}
          className="button button--light reveal"
          {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
        >
          <span>{site.cta.button}</span>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h12m0 0L9 3m5 5l-5 5" /></svg>
        </a>
      </div>
    </section>
  );
}
