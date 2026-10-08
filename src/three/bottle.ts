import * as THREE from 'three';
import type { Product } from '../lib/products';

/**
 * Transforma o PNG de um produto em uma embalagem 3D.
 *
 * 1. Lê o contorno (silhueta) linha a linha.
 * 2. Gira esse contorno em volta de um eixo vertical (como um torno),
 *    achatando a profundidade conforme `product.depth`.
 * 3. A metade da frente usa a foto, mapeada de forma que, vista de frente,
 *    a embalagem fica idêntica à imagem original.
 * 4. As bordas da frente viram plástico liso (para a lateral não esticar).
 * 5. A metade de trás usa um "verso" gerado: a cor do plástico de cada
 *    altura + um rótulo traseiro desenhado com as informações do produto.
 */

export type Bottle = {
  geometry: THREE.BufferGeometry;
  front: THREE.Texture;
  back: THREE.Texture;
  /** largura / altura (em unidades do mundo, altura = 1) */
  width: number;
  depth: number;
};

const ROWS = 120;
const SEG = 28; // segmentos por meia-volta

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const median = (a: number[]) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[s.length >> 1];
};

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export async function buildBottle(p: Product, maxAnisotropy = 8): Promise<Bottle> {
  const img = await loadImage(p.webp ?? p.src);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true })!;
  cx.drawImage(img, 0, 0);
  const px = cx.getImageData(0, 0, w, h).data;
  const alpha = (x: number, y: number) => px[(y * w + x) * 4 + 3];

  // ── 1. silhueta ─────────────────────────────────────────────
  const rawL = new Float32Array(h).fill(-1);
  const rawR = new Float32Array(h).fill(-1);
  for (let y = 0; y < h; y++) {
    let l = -1, r = -1;
    for (let x = 0; x < w; x++) if (alpha(x, y) > 110) { l = x; break; }
    if (l < 0) continue;
    for (let x = w - 1; x >= l; x--) if (alpha(x, y) > 110) { r = x; break; }
    if (r - l < 2) continue;
    rawL[y] = l;
    rawR[y] = r + 1;
  }
  // mediana vertical para tirar serrilhado
  const L = new Float32Array(h).fill(-1);
  const R = new Float32Array(h).fill(-1);
  for (let y = 0; y < h; y++) {
    if (rawL[y] < 0) continue;
    const ls: number[] = [], rs: number[] = [];
    for (let k = -3; k <= 3; k++) {
      const yy = y + k;
      if (yy >= 0 && yy < h && rawL[yy] >= 0) {
        ls.push(rawL[yy]);
        rs.push(rawR[yy]);
      }
    }
    L[y] = median(ls);
    R[y] = median(rs);
  }

  let yTop = 0, yBot = h - 1;
  while (yTop < h && L[yTop] < 0) yTop++;
  while (yBot > 0 && L[yBot] < 0) yBot--;

  // corpo = maior trecho contínuo de linhas largas
  let maxW = 0;
  for (let y = yTop; y <= yBot; y++) if (L[y] >= 0) maxW = Math.max(maxW, R[y] - L[y]);
  let b0 = yTop, b1 = yTop, run0 = -1;
  for (let y = yTop; y <= yBot + 1; y++) {
    const wide = y <= yBot && L[y] >= 0 && R[y] - L[y] >= maxW * 0.78;
    if (wide && run0 < 0) run0 = y;
    if (!wide && run0 >= 0) {
      if (y - run0 > b1 - b0) { b0 = run0; b1 = y - 1; }
      run0 = -1;
    }
  }
  const centers: number[] = [];
  for (let y = b0; y <= b1; y++) centers.push((L[y] + R[y]) / 2);
  const axis = median(centers);

  // ── 2. perfil amostrado ─────────────────────────────────────
  const ws = 1 / (yBot - yTop); // pixels → mundo (altura = 1)
  const depthK = p.depth ?? 0.85;
  const prof: { y: number; Y: number; c: number; r: number }[] = [];
  let last = { c: 0, r: 0 };
  for (let j = 0; j <= ROWS; j++) {
    const y = Math.round(yTop + ((yBot - yTop) * j) / ROWS);
    if (L[y] >= 0) last = { c: (L[y] + R[y]) / 2 - axis, r: (R[y] - L[y]) / 2 };
    prof.push({ y, Y: (yBot - y) * ws, ...last });
  }

  // ── 3. malha ────────────────────────────────────────────────
  const ringSize = SEG + 1;
  const vertsPerRow = ringSize * 2;
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  const front: number[] = [], back: number[] = [];

  for (let j = 0; j <= ROWS; j++) {
    const { y, Y, c, r } = prof[j];
    const pj = prof[Math.max(0, j - 1)], nj = prof[Math.min(ROWS, j + 1)];
    const dY = pj.Y - nj.Y || 1e-6;
    const clampD = (v: number) => Math.max(-6, Math.min(6, v));
    const dc = clampD(((pj.c - nj.c) * ws) / dY);
    const dr = clampD(((pj.r - nj.r) * ws) / dY);
    const rU = Math.max(0, r - 1.8); // recuo para não amostrar a borda transparente

    for (let half = 0; half < 2; half++) {
      for (let k = 0; k <= SEG; k++) {
        const th = -Math.PI / 2 + Math.PI * half + (Math.PI * k) / SEG;
        const s = Math.sin(th), co = Math.cos(th);
        const rw = r * ws, cw = c * ws;
        pos.push(cw + rw * s, Y, depthK * rw * co);

        // normal analítica da superfície de revolução
        const tx = rw * co, tz = -depthK * rw * s; // ∂/∂θ
        const ux = dc + dr * s, uz = depthK * dr * co; // ∂/∂Y (uy = 1)
        let nx = 0 * uz - tz * 1, ny = tz * ux - tx * uz, nz = tx * 1 - 0 * ux;
        const len = Math.hypot(nx, ny, nz);
        if (len < 1e-6) { nx = 0; ny = 1; nz = 0; } else { nx /= len; ny /= len; nz /= len; }
        nor.push(nx, ny, nz);

        const col = axis + c + rU * s;
        const u = half === 0 ? col / w : (w - col) / w;
        uv.push(u, 1 - y / h);
      }
    }
    if (j === ROWS) break;
    const base = j * vertsPerRow;
    for (let half = 0; half < 2; half++) {
      const list = half === 0 ? front : back;
      for (let k = 0; k < SEG; k++) {
        const a = base + half * ringSize + k;
        const b = a + 1;
        const cI = a + vertsPerRow;
        const d = cI + 1;
        list.push(a, cI, b, b, cI, d);
      }
    }
  }

  // tampas (topo e base)
  const cap = (j: number, up: boolean) => {
    const { y, Y, c } = prof[j];
    for (let half = 0; half < 2; half++) {
      const center = pos.length / 3;
      pos.push(c * ws, Y, 0);
      nor.push(0, up ? 1 : -1, 0);
      uv.push(half === 0 ? (axis + c) / w : (w - axis - c) / w, 1 - y / h);
      const list = half === 0 ? front : back;
      const ring = j * vertsPerRow + half * ringSize;
      for (let k = 0; k < SEG; k++) list.push(center, ring + k + 1, ring + k);
    }
  };
  cap(0, true);
  cap(ROWS, false);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex([...front, ...back]);
  geometry.addGroup(0, front.length, 0);
  geometry.addGroup(front.length, back.length, 1);
  geometry.computeBoundingSphere();

  const painted = await paintTextures(p, px, w, h, L, R, axis, yTop, yBot, b0, b1);
  const tex = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAnisotropy;
    return t;
  };
  const frontTex = tex(painted.front);
  const backTex = tex(painted.back);

  return {
    geometry,
    front: frontTex,
    back: backTex,
    width: maxW * ws,
    depth: maxW * ws * depthK,
  };
}

// ── verso ─────────────────────────────────────────────────────

async function paintTextures(
  p: Product,
  px: Uint8ClampedArray,
  w: number,
  h: number,
  L: Float32Array,
  R: Float32Array,
  axis: number,
  yTop: number,
  yBot: number,
  b0: number,
  b1: number,
) {
  // 1. cor do plástico em cada altura (mediana do centro + cores das bordas)
  type RGB = [number, number, number];
  const mid: (RGB | null)[] = new Array(h).fill(null);
  const sample = (y: number, x0: number, x1: number): RGB | null => {
    const r: number[] = [], g: number[] = [], b: number[] = [];
    for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(w - 1, Math.ceil(x1)); x++) {
      const i = (y * w + x) * 4;
      if (px[i + 3] < 200) continue;
      r.push(px[i]); g.push(px[i + 1]); b.push(px[i + 2]);
    }
    if (!r.length) return null;
    return [median(r), median(g), median(b)];
  };
  for (let y = yTop; y <= yBot; y++) {
    if (L[y] < 0) continue;
    const W = R[y] - L[y];
    mid[y] = sample(y, L[y] + W * 0.15, R[y] - W * 0.15);
  }
  // mediana vertical (preserva a divisão tampa/corpo, remove ruído do rótulo)
  const filt = (arr: (RGB | null)[]) =>
    arr.map((_, y) => {
      if (!arr[y]) return null;
      const win: RGB[] = [];
      for (let k = -9; k <= 9; k++) {
        const v = arr[y + k];
        if (v) win.push(v);
      }
      return [0, 1, 2].map((ch) => median(win.map((c) => c[ch]))) as RGB;
    });
  // a cor mediana do plástico é usada nas laterais e no verso
  const M = majority(filt(mid), Math.max(20, Math.round(h * 0.06)));
  // tons muito próximos da cor do corpo viram exatamente a cor do corpo
  const bodyCols = M.slice(b0, b1 + 1).filter(Boolean) as RGB[];
  const bodyColor = bodyCols.length ? ([0, 1, 2].map((ch) => median(bodyCols.map((c) => c[ch]))) as RGB) : null;
  if (bodyColor) {
    const bc = bodyColor;
    for (let y = 0; y < h; y++) {
      const c = M[y];
      if (c && Math.hypot(c[0] - bc[0], c[1] - bc[1], c[2] - bc[2]) < 48) M[y] = bc;
    }
  }
  const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  // frente: as últimas colunas da foto viram plástico liso, senão elas
  // "esticam" em listras quando a embalagem mostra a lateral
  const frontCv = document.createElement('canvas');
  frontCv.width = w;
  frontCv.height = h;
  const fctx = frontCv.getContext('2d')!;
  const fData = fctx.createImageData(w, h);
  fData.data.set(px);
  const fd = fData.data;
  for (let y = yTop; y <= yBot; y++) {
    if (L[y] < 0) continue;
    const m = M[y];
    if (!m) continue;
    const c = (L[y] + R[y]) / 2, half = (R[y] - L[y]) / 2;
    for (let x = Math.floor(L[y]); x < Math.ceil(R[y]); x++) {
      const t = Math.abs(x - c) / half;
      const k = smoothstep(0.8, 0.97, t);
      if (k <= 0) continue;
      const i = (y * w + x) * 4;
      const src: RGB = [fd[i], fd[i + 1], fd[i + 2]];
      const out = mix(src, m, k);
      fd[i] = out[0]; fd[i + 1] = out[1]; fd[i + 2] = out[2];
    }
  }
  fctx.putImageData(fData, 0, 0);

  const small = document.createElement('canvas');
  small.width = w;
  small.height = h;
  const sctx = small.getContext('2d')!;
  const out = sctx.createImageData(w, h);
  const o = out.data;
  for (let y = yTop; y <= yBot; y++) {
    if (L[y] < 0 || !M[y]) continue;
    const m = M[y]!;
    // espelhado: a borda esquerda do verso é a borda direita da frente
    const x0 = w - R[y], x1 = w - L[y];
    for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
      if (x < 0 || x >= w) continue;
      const i = (y * w + x) * 4;
      const srcA = px[(y * w + (w - 1 - x)) * 4 + 3];
      o[i] = m[0]; o[i + 1] = m[1]; o[i + 2] = m[2]; o[i + 3] = srcA;
    }
  }
  sctx.putImageData(out, 0, 0);

  // 2. amplia para ter texto nítido
  const K = Math.min(3, Math.max(1, 1600 / h));
  const big = document.createElement('canvas');
  big.width = Math.round(w * K);
  big.height = Math.round(h * K);
  const ctx = big.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, big.width, big.height);

  // 3. rótulo traseiro
  // Região: parte do meio do corpo. Para cima, para quando a cor muda (não
  // invade uma tampa da mesma largura); para baixo, vai até o fim do corpo.
  // Nos dois sentidos exige uma largura mínima (garrafas com "cintura").
  const ym = Math.round((b0 + b1) / 2);
  const ref = bodyColor ?? M[ym] ?? [255, 255, 255];
  const near = (y: number) => {
    const c = M[y];
    return !!c && Math.hypot(c[0] - ref[0], c[1] - ref[1], c[2] - ref[2]) < 70;
  };
  let maxWidth = 0;
  for (let y = yTop; y <= yBot; y++) if (L[y] >= 0) maxWidth = Math.max(maxWidth, R[y] - L[y]);
  const wide = (y: number) => L[y] >= 0 && R[y] - L[y] >= maxWidth * 0.66;
  let c0 = ym, c1 = ym;
  while (c0 > yTop && wide(c0 - 1) && near(c0 - 1)) c0--;
  while (c1 < yBot && wide(c1 + 1)) c1++;
  if (c1 - c0 < (b1 - b0) * 0.4) { c0 = b0; c1 = b1; }
  const bodyH = c1 - c0;
  const top = c0 + bodyH * 0.08;
  const bottom = c1 - bodyH * 0.06;
  let minW = Infinity;
  for (let y = Math.floor(top); y <= bottom; y++) if (L[y] >= 0) minW = Math.min(minW, R[y] - L[y]);
  const labelW = minW * 0.76 * K;
  const labelH = (bottom - top) * K;
  const labelX = (w - axis) * K - labelW / 2;
  const labelY = top * K;

  try {
    await Promise.all([
      document.fonts.load('800 40px Manrope'),
      document.fonts.load('600 20px Manrope'),
      document.fonts.load('500 20px Manrope'),
    ]);
  } catch {
    /* fontes do sistema servem */
  }
  drawLabel(ctx, p, labelX, labelY, labelW, labelH);
  return { front: frontCv, back: big };
}

/**
 * Filtro de maioria por altura: cada linha assume a cor mais comum na
 * vizinhança. Remove faixas finas (textos grandes do rótulo) e preserva
 * regiões grandes, como a tampa.
 */
function majority(cols: ([number, number, number] | null)[], radius: number) {
  const key = (c: [number, number, number]) => ((c[0] >> 5) << 6) | ((c[1] >> 5) << 3) | (c[2] >> 5);
  const keys = cols.map((c) => (c ? key(c) : -1));
  return cols.map((c, y) => {
    if (!c) return null;
    const count = new Map<number, number>();
    for (let k = -radius; k <= radius; k++) {
      const v = keys[y + k];
      if (v === undefined || v < 0) continue;
      count.set(v, (count.get(v) ?? 0) + 1);
    }
    let best = keys[y], bestN = 0;
    for (const [v, nn] of count) if (nn > bestN) { best = v; bestN = nn; }
    if (best === keys[y]) return c;
    // cor real mais próxima que pertence à classe vencedora
    for (let k = 1; k <= radius; k++) {
      for (const yy of [y - k, y + k]) if (keys[yy] === best) return cols[yy];
    }
    return c;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(/ +/); // só espaço comum: o NBSP mantém "✓ texto" junto
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
}

function drawLabel(ctx: CanvasRenderingContext2D, p: Product, x: number, y: number, W: number, H: number) {
  const ink = '#141a26';
  const soft = '#5a6070';
  const accent = p.accent;
  const back = p.back ?? {};
  const brand = (p.brand ?? p.name).toUpperCase();
  const title = back.title ?? p.description;
  const comp = back.composition ?? [];
  const claims = back.claims ?? p.highlights ?? [];
  const usage = back.usage;

  // fundo do rótulo
  const radius = W * 0.04;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.12)';
  ctx.shadowBlur = W * 0.02;
  ctx.fillStyle = '#fbfaf6';
  ctx.beginPath();
  ctx.roundRect(x, y, W, H, radius);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = accent;
  ctx.fillRect(x, y + radius * 0.2, W * 0.018, H - radius * 0.4);

  const pad = W * 0.09;
  const innerW = W - pad * 2;
  const set = (weight: number, size: number, spacing = 0) => {
    ctx.font = `${weight} ${size}px Manrope, system-ui, sans-serif`;
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${spacing}px`;
  };

  // layout com auto-ajuste: diminui a escala até caber
  const layout = (f: number, draw: boolean) => {
    let cy = y + pad * 0.95;
    const line = (txt: string, weight: number, size: number, color: string, spacing = 0, lh = 1.28) => {
      set(weight, size * f, spacing * f);
      for (const l of wrap(ctx, txt, innerW)) {
        if (draw) {
          ctx.fillStyle = color;
          ctx.fillText(l, x + pad, cy + size * f);
        }
        cy += size * f * lh;
      }
    };
    const heading = (txt: string) => {
      cy += W * 0.04 * f;
      line(txt, 800, W * 0.036, soft, W * 0.006, 1.6);
    };

    // a marca precisa caber em uma linha
    set(800, W * 0.12 * f);
    const fitBrand = Math.min(1, innerW / ctx.measureText(brand).width);
    line(brand, 800, W * 0.12 * fitBrand, ink, -W * 0.002, 1.05);
    cy += W * 0.02 * f;
    if (draw) {
      ctx.fillStyle = accent;
      ctx.fillRect(x + pad, cy, W * 0.16 * f, Math.max(2, W * 0.008));
    }
    cy += W * 0.04 * f;
    if (title) line(title, 600, W * 0.055, ink, 0, 1.3);

    if (comp.length) {
      heading('COMPOSIÇÃO / ATIVOS');
      line(comp.join(' · '), 500, W * 0.048, ink, 0, 1.4);
    }
    if (claims.length) {
      heading('DESTAQUES');
      for (const c of claims) line(`✓  ${c}`, 500, W * 0.046, ink, 0, 1.42);
    }
    if (usage) {
      heading('MODO DE USO');
      line(usage, 500, W * 0.044, ink, 0, 1.4);
    }
    return cy - y;
  };

  const footer = W * 0.2;
  let f = 1.7;
  while (f > 0.45 && layout(f, false) > H - footer - pad * 0.4) f *= 0.93;
  layout(f, true);

  // rodapé: conteúdo, marca e código de barras decorativo
  const fy = y + H - pad * 0.85;
  ctx.strokeStyle = 'rgba(20,26,38,0.12)';
  ctx.lineWidth = Math.max(1, W * 0.003);
  ctx.beginPath();
  ctx.moveTo(x + pad, fy - footer * 0.78);
  ctx.lineTo(x + W - pad, fy - footer * 0.78);
  ctx.stroke();

  if (p.size) {
    set(800, W * 0.075);
    ctx.fillStyle = ink;
    ctx.fillText(p.size, x + pad, fy - footer * 0.28);
  }
  set(700, W * 0.03, W * 0.005);
  ctx.fillStyle = soft;
  ctx.fillText('FRANCEFARMA COSMÉTICOS', x + pad, fy);

  const rnd = hash(p.id);
  const bw = W * 0.3, bh = footer * 0.55;
  let bx = x + W - pad - bw;
  const by = fy - bh;
  ctx.fillStyle = ink;
  while (bx < x + W - pad) {
    const t = W * (0.004 + rnd() * 0.008);
    ctx.fillRect(bx, by, Math.min(t, x + W - pad - bx), bh);
    bx += t + W * (0.004 + rnd() * 0.007);
  }
}
