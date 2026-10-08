import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { products, type Product } from '../lib/products';
import { site } from '../content/site';
import { buildBottle } from '../three/bottle';
import { Eyebrow, pad, prefersReducedMotion, clamp, words } from '../lib/ui';
import { ProductOrbit } from './ProductOrbit';
import { asset } from '../lib/asset';

/**
 * Vitrine 360°.
 *
 * Um palco fixo (sticky) desde o topo da página. Ao abrir, a esteira roda
 * sozinha com todos os produtos. Conforme o usuário rola:
 *   1. a esteira desacelera e a câmera aproxima do primeiro produto;
 *   2. cada produto gira 360° controlado pelo scroll — frente, lateral, verso;
 *   3. a esteira anda e traz o próximo produto.
 */

const FOV = 28;
const TAN = Math.tan(((FOV / 2) * Math.PI) / 180);
const INTRO = 0.9; // altura da introdução (× viewport)
const PER = 1.6; // scroll por produto (× viewport)

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const wrapC = (v: number, m: number) => ((((v + m / 2) % m) + m) % m) - m / 2;

type Face = 'front' | 'back';

export function Showcase360() {
  const n = products.length;
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const angleRef = useRef<HTMLSpanElement>(null);
  const dialRef = useRef<SVGGElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [face, setFace] = useState<Face>('front');
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const metrics = useRef({ top: 0, vh: 1 });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const section = sectionRef.current!;
    const reduced = prefersReducedMotion();
    const instant = new URLSearchParams(location.search).has('instant');

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      setFailed(true);
      return;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;

    scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc6b8, 0.95));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(-2, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xdfe8ff, 0.7);
    rim.position.set(3, 2, -4);
    scene.add(rim);

    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);

    // ── esteira ──────────────────────────────────────────────
    const BELT_LEN = 60;
    const BELT_D = 1.05;
    const STRIPE = 0.085;
    const stripeCv = document.createElement('canvas');
    stripeCv.width = 64;
    stripeCv.height = 4;
    const sc = stripeCv.getContext('2d')!;
    sc.fillStyle = '#2a2e36';
    sc.fillRect(0, 0, 64, 4);
    sc.fillStyle = '#1c1f25';
    sc.fillRect(0, 0, 5, 4);
    sc.fillStyle = '#3a3f49';
    sc.fillRect(5, 0, 2, 4);
    const stripeTex = new THREE.CanvasTexture(stripeCv);
    stripeTex.wrapS = THREE.RepeatWrapping;
    stripeTex.repeat.set(BELT_LEN / STRIPE, 1);
    stripeTex.colorSpace = THREE.SRGBColorSpace;
    stripeTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const beltGroup = new THREE.Group();
    scene.add(beltGroup);
    const dark = new THREE.MeshStandardMaterial({ color: 0x1d2027, roughness: 0.6, metalness: 0.2 });
    const beltTop = new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.55, metalness: 0.1 });
    const belt = new THREE.Mesh(new THREE.BoxGeometry(BELT_LEN, 0.06, BELT_D), [dark, dark, beltTop, dark, dark, dark]);
    belt.position.y = -0.03;
    beltGroup.add(belt);
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(BELT_LEN, 0.07, BELT_D * 0.86),
      new THREE.MeshStandardMaterial({ color: 0x2b2f37, roughness: 0.7 }),
    );
    frame.position.y = -0.095;
    beltGroup.add(frame);
    const metal = new THREE.MeshStandardMaterial({ color: 0xd5d8de, roughness: 0.22, metalness: 1 });
    for (const z of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, BELT_LEN, 16), metal);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(0, 0.005, z * (BELT_D / 2 + 0.015));
      beltGroup.add(rail);
    }

    // sombra de contato (textura radial compartilhada)
    const shCv = document.createElement('canvas');
    shCv.width = shCv.height = 128;
    const shc = shCv.getContext('2d')!;
    const grd = shc.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(0,0,0,0.75)');
    grd.addColorStop(0.5, 'rgba(0,0,0,0.3)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    shc.fillStyle = grd;
    shc.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(shCv);
    const shadowGeo = new THREE.PlaneGeometry(1, 1);

    // ── produtos ─────────────────────────────────────────────
    type Item = { p: Product; group: THREE.Group; mesh: THREE.Mesh; mats: THREE.MeshStandardMaterial[] };
    let items: Item[] = [];
    const disposables: { dispose: () => void }[] = [];

    // ── layout ───────────────────────────────────────────────
    // espaçamento entre produtos: junto na abertura (sIntro), afastado no foco (sFocus)
    let W = 1, H = 1, aspect = 1, stacked = false, sIntro = 1.25, sFocus = 2.3;
    const loop = Math.max(n, 4);
    const measure = () => {
      const r = section.getBoundingClientRect();
      metrics.current = { top: r.top + window.scrollY, vh: window.innerHeight };
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      aspect = W / H;
      stacked = W < 1100;
      sIntro = W < 760 ? 0.86 : 1.25;
      sFocus = W < 760 ? 0.86 : stacked ? 1.3 : 2.3;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, W < 760 ? 1.6 : 1.75));
      renderer.setSize(W, H, false);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    };

    const view = (e: number) => {
      // introdução: mostra a esteira inteira
      const needW = Math.min(loop * sIntro - 1.4, stacked ? 3.2 : 7.6);
      const dIntro = Math.max(stacked ? 6 : 5.2, needW / (2 * TAN * aspect));
      // foco: o produto ocupa boa parte da altura
      const share = W < 760 ? 0.42 : stacked ? 0.5 : 0.7;
      const dFocus = 1 / (share * 2 * TAN);
      const visH = 2 * dFocus * TAN;
      const offX = stacked ? 0 : -0.11 * visH * aspect;
      const lookFocusY = stacked ? 0.5 - 0.12 * visH : 0.52;
      const d = dIntro + (dFocus - dIntro) * e;
      const lx = offX * e;
      const ly = 0.42 + (lookFocusY - 0.42) * e;
      camera.position.set(lx, ly + d * (0.16 - 0.08 * e), d);
      camera.lookAt(lx, ly, 0);
    };

    // ── estado da animação ───────────────────────────────────
    let sCur = 0, last = performance.now(), raf = 0, running = false;
    // posições da esteira medidas em "produtos" (1 = um produto de distância)
    let bDrift = 0, vel = reduced ? 0 : 0.18, delta = 0;
    let activeIdx = -1, faceNow: Face = 'front';

    const frameFn = (now: number) => {
      raf = requestAnimationFrame(frameFn);
      const dt = Math.min(0.064, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const { top, vh } = metrics.current;
      const sTarget = Math.max(0, window.scrollY - top);
      // ?instant na URL desliga a suavização (útil para testes/capturas)
      sCur = reduced || instant ? sTarget : sCur + (sTarget - sCur) * (1 - Math.exp(-dt * 7));
      if (Math.abs(sTarget - sCur) < 0.3) sCur = sTarget;

      const e = smoother(clamp(sCur / (vh * INTRO)));
      const u = clamp((sCur - vh * INTRO) / (vh * PER), 0, n - 1e-4);
      const k = Math.floor(u);
      const q = u - k;
      const travel = k < n - 1 ? ease(clamp((q - 0.8) / 0.2)) : 0;
      const spinT = ease(clamp((q - 0.05) / 0.68));
      const spin = spinT * Math.PI * 2;
      const bScroll = k + travel;
      const S = sIntro + (sFocus - sIntro) * e;

      // a esteira roda sozinha no topo e para quando o usuário começa a rolar
      const vTarget = e < 0.001 && !reduced ? 0.18 : 0;
      vel += (vTarget - vel) * (1 - Math.exp(-dt * 3));
      bDrift += vel * dt;
      if (e < 0.001) delta = wrapC(-bDrift, loop);
      else delta -= vel * dt;
      const bx = bDrift + e * delta + bScroll;
      beltTop.map!.offset.x = (bx * S) / STRIPE;

      const act = travel > 0.5 ? k + 1 : k;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        it.group.position.x = wrapC(i - bx, loop) * S;
        const sway = reduced ? 0 : Math.sin(t * 0.5 + i * 1.7) * 0.6;
        const focusRot = i === k ? spin : 0;
        it.mesh.rotation.y = sway * (1 - e) + focusRot * e;
        const dim = 1 - (i === act ? 0 : 0.5) * e;
        it.mats[0].color.setScalar(dim);
        it.mats[1].color.setScalar(dim);
      }
      view(e);

      // DOM direto (sem re-render)
      introRef.current!.style.opacity = String(clamp(1 - e * 2.2));
      introRef.current!.style.transform = `translate3d(0, ${(-e * 40).toFixed(1)}px, 0)`;
      panelRef.current!.style.opacity = String(clamp((e - 0.55) / 0.35));
      hintRef.current!.style.opacity = String(clamp((e - 0.7) / 0.3) * clamp(1 - u * 3));
      const deg = Math.round((act === k ? spinT : 0) * 360);
      angleRef.current!.textContent = `${deg}°`;
      dialRef.current!.style.transform = `rotate(${deg}deg)`;
      barRef.current!.style.setProperty('--p', String(n > 1 ? (k + travel) / (n - 1) : 1));

      if (act !== activeIdx) {
        activeIdx = act;
        setActive(act);
      }
      const cos = Math.cos(act === k ? spin : 0);
      const f: Face = cos < -0.15 ? 'back' : cos > 0.15 ? 'front' : faceNow;
      if (f !== faceNow) {
        faceNow = f;
        setFace(f);
      }

      renderer.render(scene, camera);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frameFn);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // ── carrega as embalagens ────────────────────────────────
    let cancelled = false;
    const aniso = renderer.capabilities.getMaxAnisotropy();
    Promise.allSettled(products.map((p) => buildBottle(p, aniso))).then((res) => {
      if (cancelled) return;
      items = [];
      res.forEach((r, i) => {
        if (r.status !== 'fulfilled') return;
        const b = r.value;
        const p = products[i];
        const mk = (map: THREE.Texture) =>
          new THREE.MeshStandardMaterial({ map, roughness: 0.3, metalness: 0, envMapIntensity: 0.55, alphaTest: 0.2, side: THREE.DoubleSide });
        const mats = [mk(b.front), mk(b.back)];
        const mesh = new THREE.Mesh(b.geometry, mats);
        const group = new THREE.Group();
        group.scale.setScalar(p.scale);
        group.add(mesh);
        const shadow = new THREE.Mesh(
          shadowGeo,
          new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.55 }),
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.002;
        shadow.scale.set(b.width * 1.7, Math.max(b.depth, b.width * 0.5) * 1.9, 1);
        group.add(shadow);
        scene.add(group);
        items.push({ p, group, mesh, mats });
        disposables.push(b.geometry, b.front, b.back, ...mats, shadow.material as THREE.Material);
      });
      if (!items.length) {
        setFailed(true);
        return;
      }
      setReady(true);
    });

    const io = new IntersectionObserver(([en]) => (en.isIntersecting ? start() : stop()));
    const ro = new ResizeObserver(measure);
    measure();
    ro.observe(canvas);
    ro.observe(document.body);
    io.observe(section);

    return () => {
      cancelled = true;
      stop();
      io.disconnect();
      ro.disconnect();
      disposables.forEach((d) => d.dispose());
      [stripeTex, shadowTex, shadowGeo, belt.geometry, frame.geometry, dark, beltTop, metal, envRT].forEach((d) => d.dispose());
      pmrem.dispose();
      renderer.dispose();
    };
  }, [n]);

  const goTo = (i: number) => {
    const { top, vh } = metrics.current;
    window.scrollTo({
      top: top + vh * INTRO + i * vh * PER + 2,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  };

  if (failed) return <ProductOrbit />;

  const p = products[active] ?? products[0];
  if (!p) return null;
  const back = p.back ?? {};
  let wi = 0;

  return (
    <section
      ref={sectionRef}
      className={`s360 ${ready ? 'is-ready' : ''}`}
      id="produtos"
      data-nav="light"
      style={{ height: `${(INTRO + n * PER) * 100 + 100}vh`, '--accent': p.accent } as CSSProperties}
    >
      <div className="s360__stage">
        <canvas ref={canvasRef} className="s360__canvas" aria-hidden="true" />

        <div className="s360__loader" aria-hidden="true">
          <img src={asset('/mark.svg')} alt="" />
        </div>

        <div className="s360__intro" ref={introRef}>
          <img src={asset('/logo.png')} alt={site.brandFull} className="s360__logo" width={251} height={78} />
          <div className="s360__intro-bottom">
            <h1 className="s360__title">
              {words(site.hero.headline).map(({ word, em }, i) => (
                <span key={i}>
                  <span className="word">
                    <span className={`word__inner ${em ? 'is-em' : ''}`} style={{ '--d': `${0.5 + wi++ * 0.06}s` } as CSSProperties}>
                      {word}
                    </span>
                  </span>{' '}
                </span>
              ))}
            </h1>
            <p className="s360__intro-sub reveal-up" style={{ '--d': '1.1s' } as CSSProperties}>
              Role para ver cada produto em 360°
              <span className="s360__intro-line" aria-hidden="true" />
            </p>
          </div>
        </div>

        <div className="s360__panel" ref={panelRef}>
          <Eyebrow className="s360__eyebrow">360° · Frente e verso</Eyebrow>

          <div className="orbit__counter s360__counter" aria-hidden="true">
            <span className="orbit__counter-current">
              <span className="orbit__counter-roll" style={{ '--i': active } as CSSProperties}>
                {products.map((_, i) => (
                  <span key={i}>{pad(i + 1)}</span>
                ))}
              </span>
            </span>
            <span className="orbit__counter-total">/ {pad(n)}</span>
          </div>

          <div className="s360__copy" key={`${p.id}-${face}`} aria-live="polite">
            <p className="s360__category">{p.category}</p>
            <h2 className="s360__name">{p.name}</h2>
            {face === 'front' ? (
              <>
                {p.description && <p className="s360__desc">{p.description}</p>}
                {(p.highlights?.length || p.size) && (
                  <p className="s360__meta">{[...(p.highlights ?? []), p.size].filter(Boolean).join('  ·  ')}</p>
                )}
              </>
            ) : (
              <>
                {back.composition?.length ? (
                  <div className="s360__block">
                    <h3>Composição / ativos</h3>
                    <p>{back.composition.join(' · ')}</p>
                  </div>
                ) : null}
                {back.claims?.length ? (
                  <div className="s360__block">
                    <h3>Destaques</h3>
                    <ul>
                      {back.claims.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="s360__face" aria-hidden="true">
            <svg viewBox="0 0 40 40" className="s360__dial">
              <circle cx="20" cy="20" r="17" />
              <g ref={dialRef} className="s360__dial-hand">
                <line x1="20" y1="20" x2="20" y2="5" />
                <circle cx="20" cy="5" r="2.4" />
              </g>
            </svg>
            <span className="s360__angle" ref={angleRef}>0°</span>
            <span className={`s360__face-tag ${face === 'front' ? 'is-on' : ''}`}>Frente</span>
            <span className={`s360__face-tag ${face === 'back' ? 'is-on' : ''}`}>Verso</span>
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

        <div className="s360__hint" ref={hintRef} aria-hidden="true">
          <span className="orbit__hint-mouse"><span /></span>
          Role para girar
        </div>
      </div>
    </section>
  );
}
