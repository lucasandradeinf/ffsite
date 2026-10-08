import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { products } from '../lib/products';
import { site } from '../content/site';
import { ProductImage, Eyebrow, pad, prefersReducedMotion, clamp } from '../lib/ui';

/**
 * A grande órbita.
 *
 * Os produtos ficam sobre um círculo enorme cujo centro está abaixo da tela.
 * O scroll gira esse círculo: o produto do topo do arco é o destaque; os
 * vizinhos descem pelas laterais, ficam menores, mais escuros e desfocados.
 *
 * Tudo é escrito direto no DOM (transform/opacity/filter) dentro de um único
 * requestAnimationFrame — o React só re-renderiza quando o produto ativo muda.
 */

type Layout = {
  cx: number; cy: number;   // onde fica o produto em destaque
  R: number;                // raio da órbita
  step: number;             // ângulo entre produtos (rad)
  size: number;             // altura do produto em destaque (px)
  falloff: number;          // quanto os vizinhos encolhem
  rotK: number;             // quanto o produto acompanha a tangente
  blur: number;             // desfoque máximo (px)
  exitFade: number;         // fade extra de quem sai pela esquerda
};

function computeLayout(w: number, h: number): Layout {
  if (w < 760) {
    const R = w * 1.5;
    return {
      cx: w / 2, cy: h * 0.36, R,
      step: Math.asin(Math.min(0.95, (w * 0.66) / R)),
      size: Math.min(h * 0.42, w * 1.0),
      falloff: 0.62, rotK: 0.85, blur: 0, exitFade: 0,
    };
  }
  if (w < 1100) {
    const R = Math.max(w * 1.05, h * 1.1);
    return {
      cx: w * 0.5, cy: h * 0.34, R,
      step: Math.asin((w * 0.34) / R),
      size: Math.min(h * 0.42, 560),
      falloff: 0.55, rotK: 0.7, blur: 1.5, exitFade: 0,
    };
  }
  const R = Math.max(w * 0.95, h * 1.35);
  return {
    cx: w * 0.62, cy: h * 0.52, R,
    step: Math.asin((w * 0.25) / R),
    size: Math.min(h * 0.64, 720),
    falloff: 0.5, rotK: 0.6, blur: 2.4, exitFade: 0.55,
  };
}

/** Faz cada produto "parar" um pouco no destaque antes de seguir girando. */
function dwell(raw: number, n: number) {
  if (raw <= 0) return 0;
  if (raw >= n - 1) return n - 1;
  const i = Math.floor(raw);
  const D = 0.16;
  const g = clamp((raw - i - D) / (1 - 2 * D));
  return i + g * g * (3 - 2 * g);
}

export function ProductOrbit() {
  const n = products.length;
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const metrics = useRef({ top: 0, scrollable: 1 });

  useEffect(() => {
    const section = sectionRef.current!;
    const stage = stageRef.current!;
    const reduced = prefersReducedMotion();
    let L = computeLayout(stage.clientWidth, stage.clientHeight);
    let cur = 0, last = performance.now(), raf = 0, running = false, activeIdx = 0;
    let mx = 0, my = 0, tmx = 0, tmy = 0;
    let dirty = true;
    const filters: string[] = [];

    const measure = () => {
      const r = section.getBoundingClientRect();
      metrics.current = { top: r.top + window.scrollY, scrollable: Math.max(1, section.offsetHeight - window.innerHeight) };
      L = computeLayout(stage.clientWidth, stage.clientHeight);
      stage.style.setProperty('--size', `${L.size}px`);
      const ring = ringRef.current!;
      // o anel passa pela base do produto em destaque, como uma vitrine giratória
      const ringR = L.R - L.size / 2;
      ring.style.width = ring.style.height = `${ringR * 2}px`;
      ring.style.left = `${L.cx - ringR}px`;
      ring.style.top = `${L.cy + L.size / 2}px`;
      stage.style.setProperty('--cx', `${L.cx}px`);
      stage.style.setProperty('--cy', `${L.cy}px`);
      dirty = true;
    };

    const target = () => {
      const { top, scrollable } = metrics.current;
      return dwell(clamp((window.scrollY - top) / scrollable) * (n - 1), n);
    };

    const render = () => {
      for (let i = 0; i < n; i++) {
        const el = itemRefs.current[i];
        if (!el) continue;
        const d = i - cur;
        const ad = Math.abs(d);
        if (ad > 3.2) {
          if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
          continue;
        }
        if (el.style.visibility) el.style.visibility = '';
        const phi = d * L.step;
        const x = L.cx + L.R * Math.sin(phi);
        const y = L.cy + L.R * (1 - Math.cos(phi));
        const s = 1 / (1 + L.falloff * ad);
        const rot = (phi * L.rotK * 180) / Math.PI;
        let o = clamp(1.15 - 0.4 * ad);
        if (d < 0) o *= clamp(1 - L.exitFade * ad);
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${s.toFixed(4)})`;
        el.style.opacity = o.toFixed(3);
        el.style.zIndex = String(100 - Math.round(ad * 10));

        // filtros quantizados: só reescreve quando o valor muda de verdade
        const b = reduced ? 0 : Math.round(Math.min(ad, 2) * L.blur * 2) / 2;
        const br = Math.round((1 - Math.min(ad, 1.2) * 0.32) * 20) / 20;
        const f = b === 0 && br === 1 ? '' : `blur(${b}px) brightness(${br})`;
        if (filters[i] !== f) {
          el.style.filter = f;
          filters[i] = f;
        }
      }

      const deg = (-cur * L.step * 180) / Math.PI;
      ringRef.current!.style.transform = `translate3d(${(mx * 6).toFixed(2)}px, ${(my * 4).toFixed(2)}px, 0) rotate(${deg.toFixed(3)}deg)`;
      itemsRef.current!.style.transform = `translate3d(${(mx * 14).toFixed(2)}px, ${(my * 9).toFixed(2)}px, 0)`;
      ghostRef.current!.style.setProperty('--shift', ((Math.round(cur) - cur) * 2).toFixed(4));
      hintRef.current!.style.opacity = String(clamp(1 - cur * 2.5));
      barRef.current!.style.setProperty('--p', String(n > 1 ? cur / (n - 1) : 1));
    };

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(64, t - last) / 1000;
      last = t;
      const tg = target();
      const prev = cur;
      if (reduced) cur = tg;
      else cur += (tg - cur) * (1 - Math.exp(-dt * 6.5));
      if (Math.abs(tg - cur) < 0.0004) cur = tg;

      const pmx = mx, pmy = my;
      if (!reduced) {
        mx += (tmx - mx) * (1 - Math.exp(-dt * 4));
        my += (tmy - my) * (1 - Math.exp(-dt * 4));
      }
      const moved = Math.abs(prev - cur) > 1e-5 || Math.abs(pmx - mx) > 1e-4 || Math.abs(pmy - my) > 1e-4;
      if (moved || dirty) {
        render();
        dirty = false;
      }
      const a = Math.round(cur);
      if (a !== activeIdx) {
        activeIdx = a;
        setActive(a);
      }
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      tmx = (e.clientX / window.innerWidth - 0.5) * 2;
      tmy = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: '200px 0px' });
    const ro = new ResizeObserver(measure);
    measure();
    cur = target();
    activeIdx = Math.round(cur);
    setActive(activeIdx);
    render();
    io.observe(section);
    ro.observe(stage);
    ro.observe(document.body);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
    };
  }, [n]);

  const goTo = (i: number) => {
    const { top, scrollable } = metrics.current;
    window.scrollTo({ top: top + (n > 1 ? i / (n - 1) : 0) * scrollable + 1, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    const onGoto = (e: Event) => goTo((e as CustomEvent<number>).detail);
    window.addEventListener('orbit:goto', onGoto);
    return () => window.removeEventListener('orbit:goto', onGoto);
  });

  const p = products[active] ?? products[0];
  if (!p) return null;

  return (
    <section
      className="orbit"
      id="produtos"
      ref={sectionRef}
      data-nav="dark"
      style={{ '--count': n, '--accent': p.accent } as CSSProperties}
    >
      <div className="orbit__stage" ref={stageRef}>
        <div className="orbit__glow" aria-hidden="true" />

        <div className="orbit__ghost" ref={ghostRef} aria-hidden="true">
          {products.map((q, i) => (
            <span key={q.id} className={`orbit__ghost-word ${i === active ? 'is-active' : ''} ${i < active ? 'is-past' : ''}`}>
              {q.brand ?? q.name}
            </span>
          ))}
        </div>

        <div className="orbit__ring" ref={ringRef} aria-hidden="true">
          <span className="orbit__ring-line" />
          <span className="orbit__ring-ticks" />
        </div>
        <span className="orbit__marker" aria-hidden="true" />

        <div className="orbit__items" ref={itemsRef} aria-hidden="true">
          {products.map((q, i) => (
            <div
              key={q.id}
              className={`orbit__item ${i === active ? 'is-active' : ''}`}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              style={{ '--scale': q.scale, '--float-d': `${-i * 1.7}s` } as CSSProperties}
            >
              <div className="orbit__item-inner">
                <div className="orbit__pop">
                  <div className="float">
                    <ProductImage product={q} eager={i < 2} alt="" />
                  </div>
                </div>
                <ProductImage product={q} className="orbit__reflection" alt="" />
              </div>
            </div>
          ))}
        </div>

        <div className="orbit__info">
          <Eyebrow className="orbit__eyebrow">{site.orbit.eyebrow}</Eyebrow>

          <div className="orbit__counter" aria-hidden="true">
            <span className="orbit__counter-current">
              <span className="orbit__counter-roll" style={{ '--i': active } as CSSProperties}>
                {products.map((_, i) => (
                  <span key={i}>{pad(i + 1)}</span>
                ))}
              </span>
            </span>
            <span className="orbit__counter-total">/ {pad(n)}</span>
          </div>

          <div className="orbit__copy" key={p.id} aria-live="polite">
            <p className="orbit__category">{p.category}</p>
            <h2 className="orbit__name">{p.name}</h2>
            {p.description && <p className="orbit__desc">{p.description}</p>}
            {(p.highlights?.length || p.size) && (
              <p className="orbit__meta">{[...(p.highlights ?? []), p.size].filter(Boolean).join('  ·  ')}</p>
            )}
            <a className="orbit__link" href={p.link}>
              Saiba mais
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h12m0 0L9 3m5 5l-5 5" /></svg>
            </a>
          </div>

          <div className="orbit__progress" ref={barRef}>
            <span className="orbit__progress-track" aria-hidden="true">
              <span className="orbit__progress-fill" />
            </span>
            <div className="orbit__progress-dots">
              {products.map((q, i) => (
                <button
                  key={q.id}
                  type="button"
                  className={`orbit__progress-dot ${i === active ? 'is-active' : ''} ${i < active ? 'is-past' : ''}`}
                  onClick={() => goTo(i)}
                  aria-label={`Ver ${q.name}`}
                  aria-current={i === active}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="orbit__hint" ref={hintRef} aria-hidden="true">
          <span className="orbit__hint-mouse"><span /></span>
          {site.orbit.hint}
        </div>
      </div>
    </section>
  );
}
