import { useEffect, useRef } from 'react';
import { site } from '../content/site';
import { products, brands, categories } from '../lib/products';
import { Eyebrow, words, prefersReducedMotion, clamp, pad } from '../lib/ui';

/** Manifesto: as palavras "acendem" conforme o scroll avança. */
export function Manifesto() {
  const ref = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const list = words(site.manifesto.text);

  useEffect(() => {
    const el = textRef.current!;
    const spans = Array.from(el.querySelectorAll<HTMLSpanElement>('.mword'));
    if (prefersReducedMotion()) {
      spans.forEach((s) => (s.style.opacity = '1'));
      return;
    }
    let raf = 0, visible = false, lastP = -1;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35));
      if (Math.abs(p - lastP) < 0.001) return;
      lastP = p;
      const lit = p * spans.length;
      spans.forEach((s, i) => (s.style.opacity = (0.16 + 0.84 * clamp(lit - i)).toFixed(3)));
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  const stats = [
    { value: pad(products.length), label: 'produtos em destaque' },
    { value: pad(brands.length), label: 'marcas' },
    { value: pad(categories.length), label: 'linhas de cuidado' },
  ];

  return (
    <section className="manifesto" id="sobre" ref={ref} data-nav="light">
      <div className="container">
        <Eyebrow className="reveal">{site.manifesto.eyebrow}</Eyebrow>
        <p className="manifesto__text" ref={textRef}>
          {list.map(({ word, em }, i) => (
            <span key={i} className={`mword ${em ? 'is-em' : ''}`}>
              {word}{' '}
            </span>
          ))}
        </p>

        <div className="manifesto__grid">
          <div className="manifesto__body">
            {site.manifesto.body.map((t, i) => (
              <p key={i} className="reveal" style={{ ['--d' as string]: `${i * 0.1}s` }}>
                {t}
              </p>
            ))}
          </div>
          <dl className="manifesto__stats">
            {stats.map((s, i) => (
              <div key={s.label} className="manifesto__stat reveal" style={{ ['--d' as string]: `${i * 0.1}s` }}>
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
