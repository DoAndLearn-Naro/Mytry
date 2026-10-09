/**
 * 家具 3D 手繪圖庫 — Warm Home v0.5
 * ───────────────────────────────
 * 不再用 emoji 當家具本體：每件都是等角（isometric）視角手繪 SVG，
 * 顶面淺 / 左面中 / 右面深，與角落房同光源，看起來真的坐在格子裡。
 *
 * furnitureArt(id) → svg 字串（viewBox 自動收合，CSS 以 width/height:100% 撐滿）。
 * 型錄小圖、房間本體共用同一套。
 */

const SQ = 0.8660254; // cos30
/** 垂直拉伸：等角投影 z 原生 1:1 看起來太矮胖，拉高讓家具有高度 */
export const Z_SCALE = 1.32;
let __uid = 0;

/** 等角投影（z 朝上，已拉伸） */
function iso(x, y, z) {
  return [(x - y) * SQ, (x + y) * 0.5 - z * Z_SCALE];
}

function createPainter() {
  const parts = [];
  const defs = [];
  const bb = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
  const track = (x, y) => {
    if (x < bb.x0) bb.x0 = x;
    if (y < bb.y0) bb.y0 = y;
    if (x > bb.x1) bb.x1 = x;
    if (y > bb.y1) bb.y1 = y;
  };
  const F = (n) => Math.round(n * 100) / 100;
  const pts = (list) => list.map(([x, y]) => `${F(x)},${F(y)}`).join(' ');

  const api = {
    P: iso,
    poly(list, fill, stroke = 'none', sw = 1, opacity = 1) {
      list.forEach(([x, y]) => track(x, y));
      parts.push(`<polygon points="${pts(list)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${opacity}"/>`);
    },
    rect(x, y, w, h, fill, stroke = 'none', sw = 1, rx = 0) {
      track(x, y); track(x + w, y + h);
      parts.push(`<rect x="${F(x)}" y="${F(y)}" width="${F(w)}" height="${F(h)}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`);
    },
    circle(cx, cy, r, fill, stroke = 'none', sw = 1, opacity = 1) {
      track(cx - r, cy - r); track(cx + r, cy + r);
      parts.push(`<circle cx="${F(cx)}" cy="${F(cy)}" r="${F(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${opacity}"/>`);
    },
    ellipse(cx, cy, rx, ry, fill, stroke = 'none', sw = 1, rot = 0, opacity = 1) {
      const rad = Math.abs(rot) * Math.PI / 180;
      const ex = Math.abs(rx * Math.cos(rad)) + Math.abs(ry * Math.sin(rad));
      const ey = Math.abs(rx * Math.sin(rad)) + Math.abs(ry * Math.cos(rad));
      track(cx - ex, cy - ey); track(cx + ex, cy + ey);
      const tr = rot ? ` transform="rotate(${rot} ${F(cx)} ${F(cy)})"` : '';
      parts.push(`<ellipse cx="${F(cx)}" cy="${F(cy)}" rx="${F(rx)}" ry="${F(ry)}"${tr} fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${opacity}"/>`);
    },
    line(x1, y1, x2, y2, stroke, sw = 2, cap = 'round') {
      track(x1, y1); track(x2, y2);
      parts.push(`<line x1="${F(x1)}" y1="${F(y1)}" x2="${F(x2)}" y2="${F(y2)}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="${cap}"/>`);
    },
    path(d, stroke, sw = 3, fill = 'none', bbox = null, cap = 'round') {
      if (bbox) { track(bbox[0], bbox[1]); track(bbox[2], bbox[3]); }
      parts.push(`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="${cap}"/>`);
    },
    text(x, y, str, fill, size, anchor = 'middle', weight = 800) {
      track(x - size, y - size); track(x + size, y + size * 0.4);
      parts.push(`<text x="${F(x)}" y="${F(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${fill}" font-family="system-ui,sans-serif">${str}</text>`);
    },
    gradient(id, stops) {
      defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}%" stop-color="${c}"/>`).join('')}</linearGradient>`);
    },
    /** 接地陰影：畫在 z=0 地面上（先畫、墊底），對齊桌腳解決懸空感 */
    ground(cx, cy, r, opacity = 0.3) {
      const c = iso(cx, cy, 0);
      api.ellipse(c[0], c[1] + 0.12, r * SQ, r * 0.5, '#3E2723', 'none', 0, 0, opacity);
    },
    /** 等角方塊：base 角 (x,y) 高 z，寬 w（右下）深 d（左下）高 h */
    box(x, y, z, w, d, h, c) {      const e = c.edge || '#3E2723';
      api.poly([iso(x, y, z + h), iso(x + w, y, z + h), iso(x + w, y + d, z + h), iso(x, y + d, z + h)], c.top, e, 1.2);
      api.poly([iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x, y + d, z + h)], c.left, e, 1.2);
      api.poly([iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x + w, y, z + h)], c.right, e, 1.2);
    },
    svg() {
      // 留白只給描邊一點呼吸空間（之前 pad=6 在等角單位下等於半個框，腳全飄起來）
      const pad = 0.4;
      const vx = bb.x0 - pad, vy = bb.y0 - pad;
      const vw = bb.x1 - bb.x0 + pad * 2, vh = bb.y1 - bb.y0 + pad * 2;
      return `<svg viewBox="${F(vx)} ${F(vy)} ${F(vw)} ${F(vh)}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${defs.length ? `<defs>${defs.join('')}</defs>` : ''}${parts.join('')}</svg>`;
    },
  };
  return api;
}

/* ---------- 共用色票 ---------- */
const WOOD = { top: '#D9A066', left: '#B07B4F', right: '#7C4F2C', edge: '#4E342E' };
const WOOD_D = { top: '#A47148', left: '#8A5A36', right: '#5D3A20', edge: '#3E2723' };
const FABRIC = { top: '#E8A46C', left: '#D08A4E', right: '#9A5F2E', edge: '#6E4423' };
const FABRIC_D = { top: '#D08A4E', left: '#B8743C', right: '#7E4E24', edge: '#5D3A1A' };
const LEAF = ['#5C8D4A', '#7CB342', '#4C7A3D'];
const POT = { top: '#D97B4F', left: '#C36C44', right: '#8B3E1F', edge: '#5D2812' };
const WHITE = { top: '#FFFDF7', left: '#F1EAD8', right: '#D8CDB2', edge: '#8D7B5F' };

const DRAW = {
  /* 床 3×2：底座＋床墊＋棉被＋雙枕 */
  bed(p) {
    p.ground(2.5, 1.7, 2.9);
    p.box(0, 0, 0.5, 5, 3.4, 0.9, WOOD_D);          // 床架
    p.box(0.15, 0.15, 1.4, 4.7, 3.1, 0.7, WHITE);    // 床墊
    p.box(0.15, 1.5, 2.1, 4.7, 1.75, 0.35, { top: '#C36C44', left: '#A8552F', right: '#7E3E20', edge: '#5D2812' }); // 棉被
    p.box(0.5, 0.35, 2.1, 1.5, 0.9, 0.4, WHITE);      // 枕頭1
    p.box(2.6, 0.35, 2.1, 1.5, 0.9, 0.4, WHITE);      // 枕頭2
    p.box(0, 0, 0, 5, 0.3, 1.6, WOOD_D);             // 床頭板
  },
  /* 沙發 2×1：椅座＋椅背＋扶手＋抱枕 */
  sofa(p) {
    p.ground(2, 1, 2.4);
    [[0.2, 0.2], [3.5, 0.2], [0.2, 1.5], [3.5, 1.5]].forEach(([x, y]) => p.box(x, y, 0, 0.3, 0.3, 0.6, WOOD_D));
    p.box(0, 0, 0.6, 4, 2, 1.0, FABRIC);
    p.box(0, 0, 1.0, 4, 0.6, 1.8, FABRIC_D);          // 椅背
    p.box(0, 0, 1.0, 0.6, 2, 1.4, FABRIC_D);          // 左扶手
    p.box(3.4, 0, 1.0, 0.6, 2, 1.4, FABRIC_D);        // 右扶手
    p.box(0.75, 0.35, 1.6, 1.15, 1.35, 0.35, { top: '#F2C184', left: '#DDA15E', right: '#A86A35', edge: '#6E4423' });
    p.box(2.1, 0.35, 1.6, 1.15, 1.35, 0.35, { top: '#F2C184', left: '#DDA15E', right: '#A86A35', edge: '#6E4423' });
  },
  /* 書桌 2×1：桌面＋桌腳＋抽屜＋書 */
  desk(p) {
    p.ground(2, 1, 2.4);
    [[0.2, 0.2], [3.55, 0.2], [0.2, 1.55], [3.55, 1.55]].forEach(([x, y]) => p.box(x, y, 0, 0.25, 0.25, 2.2, WOOD_D));
    p.box(0, 0, 2.2, 4, 2, 0.25, WOOD);
    p.box(2.3, 1.5, 1.2, 1.4, 0.45, 0.7, WOOD_D);     // 抽屜
    const k = p.P(3.0, 1.95, 1.55);
    p.circle(k[0], k[1], 0.09, '#3E2723');
    p.box(0.5, 0.4, 2.45, 1.2, 0.9, 0.28, { top: '#C65D3B', left: '#A84A2E', right: '#7E361F', edge: '#4E342E' }); // 書
    p.box(0.5, 1.5, 2.45, 0.5, 0.6, 0.5, { top: '#FFE9A8', left: '#E8C86A', right: '#B8923E', edge: '#6E4A2D' });   // 筆筒
  },
  /* 植物 1×1：陶盆＋三株葉 */
  plant(p) {
    p.ground(0.8, 0.8, 1.15);
    p.box(0, 0, 0, 1.6, 1.6, 1.0, POT);
    p.poly([p.P(0.28, 0.28, 1.0), p.P(1.32, 0.28, 1.0), p.P(1.32, 1.32, 1.0), p.P(0.28, 1.32, 1.0)], '#4E342E');
    const tops = [[0.8, 0.45, 2.7, -25], [0.45, 0.95, 2.45, -55], [1.15, 0.95, 2.55, 30]];
    tops.forEach(([x, y, z], i) => {
      const b = p.P(0.8, 0.8, 1.0), t = p.P(x, y, z);
      p.line(b[0], b[1], t[0], t[1], '#4C7A3D', 0.12);
      p.ellipse(t[0], t[1], 0.5, 0.3, LEAF[i % 3], '#2E4B26', 0.08, tops[i][3]);
    });
  },
  /* 立燈 1×1：底座＋燈桿＋燈罩＋光暈 */
  lamp(p) {
    p.ground(1, 1, 1.0);
    const g = p.P(1, 1, 3.4);
    p.circle(g[0], g[1], 1.7, '#FFE9A8', 'none', 1, 0.28);
    p.box(0.4, 0.4, 0, 1.2, 1.2, 0.25, WOOD_D);
    p.box(0.85, 0.85, 0.25, 0.3, 0.3, 2.6, WOOD_D);
    const cx = 1, cy = 1;
    p.poly([p.P(cx - 0.8, cy + 0.8, 2.9), p.P(cx + 0.8, cy + 0.8, 2.9), p.P(cx + 0.45, cy + 0.45, 3.6), p.P(cx - 0.45, cy + 0.45, 3.6)], '#FFE9A8', '#8D6E63', 0.1);
    p.poly([p.P(cx + 0.8, cy - 0.8, 2.9), p.P(cx + 0.8, cy + 0.8, 2.9), p.P(cx + 0.45, cy + 0.45, 3.6), p.P(cx + 0.45, cy - 0.45, 3.6)], '#E8C86A', '#8D6E63', 0.1);
    p.poly([p.P(cx - 0.45, cy - 0.45, 3.6), p.P(cx + 0.45, cy - 0.45, 3.6), p.P(cx + 0.45, cy + 0.45, 3.6), p.P(cx - 0.45, cy + 0.45, 3.6)], '#FFF6D6', '#8D6E63', 0.1);
  },
  /* 椅子 1×1 */
  chair(p) {
    p.ground(0.9, 0.9, 1.3);
    [[0.15, 0.15], [1.4, 0.15], [0.15, 1.4], [1.4, 1.4]].forEach(([x, y]) => p.box(x, y, 0, 0.22, 0.22, 1.2, WOOD_D));
    p.box(0, 0, 1.2, 1.8, 1.8, 0.35, WOOD);
    p.box(0.1, 0.05, 1.55, 0.18, 0.2, 1.7, WOOD_D);
    p.box(1.52, 0.05, 1.55, 0.18, 0.2, 1.7, WOOD_D);
    p.box(0, 0, 2.4, 1.8, 0.22, 0.9, WOOD);
  },
  /* 杯子 1×1：小圓桌＋杯盤＋蒸氣 */
  cup(p) {
    p.ground(1, 1, 1.35);
    p.box(0.8, 0.8, 0, 0.4, 0.4, 1.1, WOOD_D);
    const c = p.P(1, 1, 1.3);
    p.ellipse(c[0], c[1], 1.25, 0.68, WOOD.top, WOOD_D.edge, 0.1);
    const s = p.P(1, 1, 1.36);
    p.ellipse(s[0], s[1], 0.62, 0.34, '#FFFDF7', '#B0A89B', 0.08);
    const b = 1, bz0 = 1.38, bz1 = 1.98;
    p.poly([p.P(b - 0.38, b + 0.38, bz1), p.P(b + 0.38, b + 0.38, bz1), p.P(b + 0.28, b + 0.28, bz0), p.P(b - 0.28, b + 0.28, bz0)], '#FFFDF7', '#8D7B5F', 0.08);
    p.poly([p.P(b + 0.38, b - 0.38, bz1), p.P(b + 0.38, b + 0.38, bz1), p.P(b + 0.28, b + 0.28, bz0), p.P(b + 0.28, b - 0.28, bz0)], '#F1EAD8', '#8D7B5F', 0.08);
    p.poly([p.P(b - 0.38, b - 0.38, bz1), p.P(b + 0.38, b - 0.38, bz1), p.P(b + 0.38, b + 0.38, bz1), p.P(b - 0.38, b + 0.38, bz1)], '#8A5A2B');
    const h = p.P(b + 0.42, b + 0.1, 1.7);
    p.path(`M ${h[0]} ${h[1]} q 0.35 0.05 0.28 0.42 q -0.06 0.32 -0.3 0.3`, '#8D7B5F', 0.1, 'none', [h[0] - 0.1, h[1] - 0.1, h[0] + 0.5, h[1] + 0.9]);
    const st = p.P(b - 0.1, b, 2.0);
    p.path(`M ${st[0]} ${st[1]} c -0.25 -0.3 0.25 -0.55 0 -0.85 c -0.25 -0.3 0.25 -0.55 0 -0.85`, '#B0BEC5', 0.09, 'none', [st[0] - 0.5, st[1] - 2.1, st[0] + 0.5, st[1] + 0.2]);
  },
  /* 搖椅 1×1：椅身＋弧形搖杆 */
  'rocking-chair'(p) {
    p.ground(1, 1, 1.5);
    const r0 = p.P(0.05, 0.35, 0.28), r1 = p.P(1.0, 1.0, -0.1), r2 = p.P(1.95, 1.65, 0.28);
    p.path(`M ${r0[0]} ${r0[1]} Q ${r1[0]} ${r1[1]} ${r2[0]} ${r2[1]}`, '#5D3A20', 0.28, 'none', [r0[0] - 0.3, r1[1] - 0.3, r2[0] + 0.3, r0[1] + 0.3]);
    p.box(0.2, 0.4, 0.85, 1.6, 1.4, 0.3, WOOD);
    p.box(0.3, 0.45, 1.15, 0.16, 0.18, 1.5, WOOD_D);
    p.box(1.54, 0.45, 1.15, 0.16, 0.18, 1.5, WOOD_D);
    p.box(0.2, 0.35, 2.0, 1.6, 0.22, 1.0, WOOD);
    p.box(0.2, 0.4, 1.35, 0.22, 1.4, 0.18, WOOD_D);
    p.box(1.58, 0.4, 1.35, 0.22, 1.4, 0.18, WOOD_D);
  },
  /* 茶几 2×1：矮桌＋茶壺＋雙杯 */
  'tea-table'(p) {
    p.ground(2, 1, 2.4);
    [[0.2, 0.2], [3.52, 0.2], [0.2, 1.52], [3.52, 1.52]].forEach(([x, y]) => p.box(x, y, 0, 0.34, 0.34, 1.0, WOOD_D));
    p.box(0, 0, 1.0, 4, 2, 0.3, WOOD_D);
    const t = p.P(1.1, 1.0, 1.75);
    p.ellipse(t[0], t[1], 0.55, 0.46, '#F5F0E6', '#8D7B5F', 0.09);
    p.ellipse(t[0], t[1] - 0.42, 0.22, 0.12, '#E4D9C2', '#8D7B5F', 0.08);
    p.circle(t[0], t[1] - 0.52, 0.09, '#8D7B5F');
    const sp = p.P(1.65, 1.0, 1.9);
    p.poly([[sp[0] - 0.1, sp[1] + 0.15], [sp[0] + 0.35, sp[1] - 0.25], [sp[0] + 0.2, sp[1] - 0.35], [sp[0] - 0.2, sp[1]]], '#EFE7D3', '#8D7B5F', 0.08);
    [[2.7, 0.7], [3.0, 1.25]].forEach(([x, y]) => {
      const u = p.P(x, y, 1.55);
      p.ellipse(u[0], u[1], 0.3, 0.17, '#FFFDF7', '#8D7B5F', 0.07);
      const v = p.P(x, y, 1.32);
      p.ellipse(v[0], v[1], 0.34, 0.19, '#E4D9C2', '#8D7B5F', 0.07);
    });
  },
  /* 畫框（牆）：木框＋山水小景 */
  frame(p) {
    const gid = `sky${++__uid}`;
    p.gradient(gid, [[0, '#BEE3F8'], [100, '#FFF3D6']]);
    p.rect(0, 0, 120, 92, '#5D4037', '#3E2723', 3, 6);
    p.rect(10, 10, 100, 72, `url(#${gid})`, '#8D6E63', 2);
    p.circle(88, 30, 10, '#FFD54F', '#E8A93D', 2);
    p.poly([[10, 82], [45, 38], [75, 82]], '#7E9B76');
    p.poly([[50, 82], [85, 44], [110, 82]], '#5D7E8A');
    p.rect(10, 70, 100, 12, '#8FBF7A', 'none', 0);
  },
  /* 時鐘（牆）：圓框＋刻度＋10:10 指針 */
  clock(p) {
    p.circle(50, 50, 44, '#5D4037', '#3E2723', 3);
    p.circle(50, 50, 36, '#FFFDF7', '#8D6E63', 2);
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 * Math.PI) / 180;
      const r1 = i % 3 === 0 ? 28 : 31, r2 = 34;
      p.line(50 + r1 * Math.sin(a), 50 - r1 * Math.cos(a), 50 + r2 * Math.sin(a), 50 - r2 * Math.cos(a), '#4E342E', i % 3 === 0 ? 3 : 1.5);
    }
    const h = ((10 * 30 + 10 * 0.5) * Math.PI) / 180, m = ((10 * 6) * Math.PI) / 180;
    p.line(50, 50, 50 + 17 * Math.sin(h), 50 - 17 * Math.cos(h), '#3E2723', 4.5);
    p.line(50, 50, 50 + 26 * Math.sin(m), 50 - 26 * Math.cos(m), '#3E2723', 3);
    p.circle(50, 50, 4, '#C62828');
  },
  /* 窗戶（牆）：木窗＋四格天空 */
  window(p) {
    const gid = `win${++__uid}`;
    p.gradient(gid, [[0, '#AEDCF5'], [100, '#FFF6DC']]);
    p.rect(0, 0, 150, 108, '#6D4C41', '#3E2723', 3, 4);
    p.rect(10, 10, 130, 88, `url(#${gid})`, '#4E342E', 2);
    p.circle(112, 32, 11, '#FFD54F', '#E8A93D', 2);
    p.ellipse(45, 40, 20, 9, '#FFFFFF', 'none', 0, 0, 0.9);
    p.ellipse(60, 46, 14, 7, '#FFFFFF', 'none', 0, 0, 0.9);
    p.rect(71, 10, 8, 88, '#6D4C41');
    p.rect(10, 50, 130, 8, '#6D4C41');
    p.rect(0, 100, 150, 8, '#8D6E63');
  },
  /* 春聯（牆）：紅底金字福 */
  'spring-couplet'(p) {
    p.rect(0, 0, 72, 112, '#C62828', '#FFD54F', 4, 6);
    p.rect(8, 8, 56, 96, 'none', '#FFD54F', 2, 3);
    p.text(36, 78, '福', '#FFD54F', 46);
    p.rect(22, -2, 28, 10, '#FFD54F', '#C8932A', 1.5, 3);
  },
};

export function furnitureArt(id) {
  const draw = DRAW[id] || DRAW.chair;
  const p = createPainter();
  draw(p);
  return p.svg();
}

/** 型錄/房間以外也可用：回傳某件的代表色（暖光/成就用） */
export function furnitureColor(id) {
  const map = {
    bed: '#8D6E63', sofa: '#D08A4E', desk: '#A47148', plant: '#5C8D4A',
    lamp: '#E8C86A', chair: '#A47148', cup: '#FFFDF7', 'rocking-chair': '#8A5A36',
    'tea-table': '#6D4C41', frame: '#5D4037', clock: '#FFFDF7', window: '#AEDCF5',
    'spring-couplet': '#C62828',
  };
  return map[id] || '#A47148';
}
