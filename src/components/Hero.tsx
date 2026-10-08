import { Fragment, useEffect, useRef, type CSSProperties } from 'react';
import { products } from '../lib/products';
import { site } from '../content/site';
import { ProductImage, words, prefersReducedMotion, clamp } from '../lib/ui';

/** Ordena do centro para fora: 0 no meio, 1 à direita, 2 à esquerda… */
function centerOut<T>(list: T[]) {
  return list.map((item, i) => ({ item, slot: i === 0 ? 0 : i % 2 ? Math.ceil(i / 2) : -i / 2 }));
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const items = centerOut(products.slice(0, 9));
  const maxSlot = Math.max(1, ...items.map((i) => Math.abs(i.slot)));

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const el = ref.current!;
    const stage = stageRef.current!;
    const copy = copyRef.current!;
    let mx = 0, my = 0, tx = 0, ty = 0, raf = 0, visible = true;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      mx += (tx - mx) * 0.06;
      my += (ty - my) * 0.06;
      const p = clamp(window.scrollY / el.offsetHeight);
      stage.style.setProperty('--mx', mx.toFixed(4));
      stage.style.setProperty('--my', my.toFixed(4));
      stage.style.transform = `translate3d(0, ${(-p * 18).toFixed(2)}vh, 0) scale(${(1 + p * 0.08).toFixed(4)})`;
      copy.style.transform = `translate3d(0, ${(p * 22).toFixed(2)}vh, 0)`;
      copy.style.opacity = String(clamp(1 - p * 1.6));
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  let wordIndex = 0;

  return (
    <section className="hero" id="top" ref={ref} data-nav="light">
      <div className="hero__copy" ref={copyRef}>
        <p className="hero__eyebrow reveal-up" style={{ '--d': '0.15s' } as CSSProperties}>
          <span className="hero__eyebrow-dot" aria-hidden="true" />
          {site.hero.eyebrow}
        </p>
        <h1 className="hero__title">
          {words(site.hero.headline).map(({ word, em }, i) => (
            <Fragment key={i}><span className="word">
              <span className={`word__inner ${em ? 'is-em' : ''}`} style={{ '--d': `${0.25 + wordIndex++ * 0.06}s` } as CSSProperties}>
                {word}
              </span>
            </span>{' '}</Fragment>
          ))}
        </h1>
        <p className="hero__sub reveal-up" style={{ '--d': '0.85s' } as CSSProperties}>
          {site.hero.sub}
        </p>
        <a href="#produtos" className="button reveal-up" style={{ '--d': '1s' } as CSSProperties}>
          <span>{site.hero.cta}</span>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v12m0 0l-5-5m5 5l5-5" /></svg>
        </a>
      </div>

      <div className="hero__stage" ref={stageRef} aria-hidden="true">
        <div className="hero__ring" />
        {items.map(({ item, slot }) => {
          const a = Math.abs(slot);
          const style = {
            '--slot': slot,
            '--abs': a,
            '--size': 1 - (a / maxSlot) * 0.42,
            '--depth': 1.4 - (a / maxSlot) * 0.9,
            '--d': `${0.35 + a * 0.09}s`,
            '--float-d': `${-a * 1.3}s`,
            '--scale': item.scale,
            zIndex: 20 - a,
          } as CSSProperties;
          return (
            <div className="hero__product" style={style} key={item.id}>
              <div className="hero__product-parallax">
                <div className="hero__product-rise">
                  <div className="float">
                    <ProductImage product={item} eager priority={slot === 0} alt="" />
                  </div>
                  <span className="hero__shadow" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hero__scroll" aria-hidden="true">
        <span>Role</span>
        <span className="hero__scroll-line" />
      </div>
    </section>
  );
}
