export type TransitionCategory =
  | 'motion'
  | 'light'
  | 'glitch'
  | 'wipe'
  | 'warp'
  | '3d';

export type TransitionDef = {
  id: string;
  name: string;
  category: TransitionCategory;
  description: string;
  fragment: string;
};

export type TransitionId = string;

export const CATEGORY_LABELS: Record<TransitionCategory, string> = {
  motion: 'Gerak',
  light: 'Cahaya',
  glitch: 'Glitch',
  wipe: 'Sapuan',
  warp: 'Distorsi',
  '3d': '3D',
};

export const CATEGORY_ORDER: TransitionCategory[] = [
  'motion',
  'light',
  'wipe',
  'glitch',
  'warp',
  '3d',
];

const slide = `
vec4 transition(vec2 uv) {
  float p = easeInOut(uProgress);
  if (uv.x < 1.0 - p) return fromAt(uv + vec2(p, 0.0));
  return toAt(uv - vec2(1.0 - p, 0.0));
}
`;

const pushUp = `
vec4 transition(vec2 uv) {
  float p = easeInOut(uProgress);
  if (uv.y < 1.0 - p) return fromAt(uv + vec2(0.0, p));
  return toAt(uv - vec2(0.0, 1.0 - p));
}
`;

const zoomPunch = `
vec4 transition(vec2 uv) {
  float p = uProgress;
  float e = easeInOut(p);
  vec2 c = uv - 0.5;
  vec2 uvA = c / (1.0 + 0.45 * e) + 0.5;
  vec2 uvB = c / mix(1.55, 1.0, e) + 0.5;
  vec4 col = mix(fromAt(uvA), toAt(uvB), smoothstep(0.25, 0.75, e));
  float flash = pow(sin(p * PI), 7.0) * (0.3 + 0.45 * uIntensity);
  col.rgb += vec3(flash);
  return col;
}
`;

const spin = `
vec4 transition(vec2 uv) {
  float p = easeInOut(uProgress);
  vec2 c = centered(uv);
  float angA = p * PI * 0.6;
  float angB = (1.0 - p) * PI * 0.6;
  vec2 uvA = uncentered(rot2(c, angA) / (1.0 + 0.3 * p));
  vec2 uvB = uncentered(rot2(c, -angB) / (1.0 + 0.3 * (1.0 - p)));
  return mix(fromAt(uvA), toAt(uvB), smoothstep(0.3, 0.7, p));
}
`;

const whipPan = `
vec4 transition(vec2 uv) {
  float p = easeInOut(uProgress);
  float amount = 0.012 + 0.03 * sin(p * PI);
  vec2 uvA = uv + vec2(p, 0.0);
  vec2 uvB = uv - vec2(1.0 - p, 0.0);
  if (uvA.x <= 1.0) return blurFrom(uvA, amount);
  return blurTo(uvB, amount);
}
`;

const stretch = `
vec4 transition(vec2 uv) {
  float p = easeInOut(uProgress);
  float sA = 1.0 - 0.55 * p;
  float sB = 0.45 + 0.55 * p;
  vec2 uvA = vec2(0.5 + (uv.x - 0.5) / max(sA, 0.05), uv.y);
  vec2 uvB = vec2(0.5 + (uv.x - 0.5) / max(sB, 0.05), uv.y);
  float amount = 0.02 * sin(p * PI);
  vec3 a = blurFrom(uvA, amount).rgb;
  vec3 b = blurTo(uvB, amount).rgb;
  return vec4(mix(a, b, smoothstep(0.25, 0.75, p)), 1.0);
}
`;

const flash = `
vec4 transition(vec2 uv) {
  float p = uProgress;
  vec4 col = mix(fromAt(uv), toAt(uv), smoothstep(0.3, 0.7, p));
  float burst = pow(sin(p * PI), 7.0);
  col.rgb = mix(col.rgb, vec3(1.0), burst * (0.5 + 0.45 * uIntensity));
  return col;
}
`;

const lightLeak = `
vec4 transition(vec2 uv) {
  float p = easeInOut(uProgress);
  vec3 col = mix(fromAt(uv).rgb, toAt(uv).rgb, smoothstep(0.15, 0.85, p));
  vec2 q = uv - vec2(0.15 + 0.7 * p, 0.12);
  vec2 d = q * vec2(2.0, 4.5);
  float leak = exp(-dot(d, d) * 4.0) * sin(p * PI);
  col += vec3(1.0, 0.42, 0.16) * leak * (0.45 + uIntensity);
  return vec4(col, 1.0);
}
`;

const filmBurn = `
vec4 transition(vec2 uv) {
  float p = uProgress;
  float n = noise21(uv * vec2(9.0, 6.0) + p * 3.0);
  float threshold = 0.08 + (1.0 - uv.y) * 0.5 + n * 0.42;
  float t = p * 1.45;
  float m = smoothstep(threshold - 0.06, threshold + 0.02, t);
  vec3 col = mix(fromAt(uv).rgb, toAt(uv).rgb, m);
  float edge = smoothstep(0.2, 0.0, abs(t - threshold));
  col = mix(col, vec3(1.0, 0.55, 0.12), edge * 0.85);
  return vec4(col, 1.0);
}
`;

const lumaWipe = `
vec4 transition(vec2 uv) {
  float p = easeInOut(uProgress);
  float g = uv.x * 0.65 + (1.0 - uv.y) * 0.35;
  float t = p * 1.35 - 0.18;
  float m = smoothstep(g - 0.22, g + 0.22, t);
  vec3 col = mix(fromAt(uv).rgb, toAt(uv).rgb, m);
  float line = exp(-pow((g - t) / 0.02, 2.0)) * sin(p * PI);
  col += vec3(line * 0.35);
  return vec4(col, 1.0);
}
`;

const clockWipe = `
vec4 transition(vec2 uv) {
  float p = easeInOut(uProgress);
  vec2 c = centered(uv);
  float ang = atan(c.y, c.x) / (2.0 * PI) + 0.5;
  float radius = length(c) / 1.1;
  float t = p * 1.25 - 0.12;
  float m = smoothstep(ang - 0.02, ang + 0.02, t);
  vec3 col = mix(fromAt(uv).rgb, toAt(uv).rgb, m);
  float line = smoothstep(0.045, 0.0, abs(ang - t)) * sin(p * PI) * smoothstep(0.95, 0.2, radius);
  col += vec3(line * 0.5);
  return vec4(col, 1.0);
}
`;

const glitch = `
vec4 transition(vec2 uv) {
  float p = uProgress;
  float burst = smoothstep(0.15, 0.45, p) * (1.0 - smoothstep(0.55, 0.85, p));
  float rowH = 0.04 + 0.06 * hash21(vec2(floor(p * 10.0), 2.0));
  float row = floor(uv.y / rowH);
  float shift = (hash21(vec2(row, floor(p * 14.0))) - 0.5) * 0.4 * burst * (0.5 + uIntensity);
  float split = (0.003 + 0.02 * burst) * (0.5 + uIntensity);
  vec2 base = uv + vec2(shift, 0.0);
  vec3 a;
  a.r = fromAt(base + vec2(split, 0.0)).r;
  a.g = fromAt(base).g;
  a.b = fromAt(base - vec2(split, 0.0)).b;
  vec3 b;
  b.r = toAt(base + vec2(split * 0.7, 0.0)).r;
  b.g = toAt(base).g;
  b.b = toAt(base - vec2(split * 0.7, 0.0)).b;
  vec3 col = mix(a, b, smoothstep(0.45, 0.6, p));
  float grain = hash21(vec2(floor(uv.y * uResolution.y / 3.0), floor(p * 30.0)));
  col += (grain - 0.5) * 0.12 * burst;
  col *= 1.0 - 0.15 * burst * step(0.5, fract(uv.y * 90.0));
  return vec4(col, 1.0);
}
`;

const rgbSplit = `
vec4 transition(vec2 uv) {
  float p = uProgress;
  float amt = sin(p * PI) * (0.008 + 0.03 * uIntensity);
  vec3 a;
  a.r = fromAt(uv + vec2(amt, 0.0)).r;
  a.g = fromAt(uv).g;
  a.b = fromAt(uv - vec2(amt, 0.0)).b;
  vec3 b;
  b.r = toAt(uv + vec2(amt * 0.7, 0.0)).r;
  b.g = toAt(uv).g;
  b.b = toAt(uv - vec2(amt * 0.7, 0.0)).b;
  return vec4(mix(a, b, smoothstep(0.3, 0.7, p)), 1.0);
}
`;

const pixelate = `
vec4 transition(vec2 uv) {
  float p = uProgress;
  float size = max(0.002, 0.06 * sin(p * PI));
  vec2 q = (floor(uv / size) + 0.5) * size;
  return mix(fromAt(q), toAt(q), smoothstep(0.35, 0.65, p));
}
`;

const scanline = `
vec4 transition(vec2 uv) {
  float p = uProgress;
  float tear = sin(p * PI);
  float band = floor(uv.y * 24.0);
  float shift = (hash21(vec2(band, floor(p * 18.0))) - 0.5) * 0.12 * tear * (0.4 + uIntensity);
  float ripple = sin(uv.y * 38.0 + p * 24.0) * 0.006 * tear;
  vec2 uvA = vec2(uv.x + shift, uv.y + ripple);
  vec2 uvB = vec2(uv.x - shift * 0.6, uv.y - ripple);
  vec3 col = mix(fromAt(uvA).rgb, toAt(uvB).rgb, smoothstep(0.3, 0.7, p));
  col *= 0.92 + 0.08 * sin(uv.y * uResolution.y * 1.6);
  return vec4(col, 1.0);
}
`;

const blinds = `
vec4 transition(vec2 uv) {
  float p = uProgress;
  float bars = 8.0;
  float row = floor(uv.y * bars);
  float delay = hash21(vec2(row, 4.0)) * 0.18;
  float e = easeInOut(clamp((p - delay) / (1.0 - delay), 0.0, 1.0));
  if (uv.x < 1.0 - e) return fromAt(uv + vec2(e, 0.0));
  return toAt(uv - vec2(1.0 - e, 0.0));
}
`;

const checker = `
vec4 transition(vec2 uv) {
  float p = uProgress;
  vec2 grid = vec2(8.0, 5.0);
  vec2 cell = floor(uv * grid);
  vec2 center = (cell + 0.5) / grid;
  float delay = hash21(cell) * 0.35;
  float e = clamp((p - delay) / (1.0 - delay), 0.0, 1.0);
  vec2 c = uv - center;
  vec2 uvA = center + c / mix(1.0, 0.02, e);
  vec2 uvB = center + c / mix(0.02, 1.0, e);
  vec3 col = mix(fromAt(uvA).rgb, toAt(uvB).rgb, smoothstep(0.45, 0.55, e));
  return vec4(col, 1.0);
}
`;

const circleWipe = `
vec4 transition(vec2 uv) {
  float p = easeInOut(uProgress);
  vec2 c = centered(uv);
  float d = length(c);
  float radius = p * 1.1;
  float m = 1.0 - smoothstep(radius - 0.04, radius + 0.04, d);
  vec3 col = mix(fromAt(uv).rgb, toAt(uv).rgb, m);
  float ring = smoothstep(0.05, 0.0, abs(d - radius)) * sin(p * PI);
  col += vec3(ring * 0.3);
  return vec4(col, 1.0);
}
`;

const curtain = `
vec4 transition(vec2 uv) {
  float p = easeInOut(uProgress);
  if (uv.x < 0.5 - 0.5 * p) return fromAt(uv + vec2(0.5 * p, 0.0));
  if (uv.x > 0.5 + 0.5 * p) return fromAt(uv - vec2(0.5 * p, 0.0));
  return toAt(uv);
}
`;

const tileFlip = `
vec4 transition(vec2 uv) {
  float p = uProgress;
  vec2 grid = vec2(7.0, 4.0);
  vec2 cell = floor(uv * grid);
  vec2 center = (cell + 0.5) / grid;
  vec2 local = (uv - center) * grid;
  float delay = hash21(cell) * 0.3;
  float e = clamp((p - delay) / (1.0 - delay), 0.0, 1.0);
  float squeeze = max(abs(1.0 - 2.0 * e), 0.04);
  vec2 sampleUv = center + vec2(local.x / squeeze, local.y) / grid;
  vec3 col = e < 0.5 ? fromAt(sampleUv).rgb : toAt(sampleUv).rgb;
  col *= 0.85 + 0.15 * squeeze;
  return vec4(col, 1.0);
}
`;

const ripple = `
vec4 transition(vec2 uv) {
  float p = uProgress;
  vec2 c = centered(uv);
  float r = length(c);
  float wave = sin(r * 26.0 - p * 18.0) * 0.018 * (1.0 - p) * (0.4 + uIntensity);
  vec2 dir = r > 0.001 ? c / r : vec2(0.0);
  vec2 uvR = uncentered(c + dir * wave);
  float m = smoothstep(r - 0.05, r + 0.05, p * 1.1);
  vec3 col = mix(fromAt(uvR).rgb, toAt(uvR).rgb, m);
  float ring = smoothstep(0.05, 0.0, abs(r - p * 1.1)) * sin(p * PI);
  col += vec3(ring * 0.2);
  return vec4(col, 1.0);
}
`;

const swirl = `
vec4 transition(vec2 uv) {
  float p = uProgress;
  vec2 c = centered(uv);
  float r = length(c);
  float amount = sin(p * PI) * (1.2 + 2.0 * uIntensity) * smoothstep(0.85, 0.0, r);
  vec2 uvS = uncentered(rot2(c, amount));
  return mix(fromAt(uvS), toAt(uvS), smoothstep(0.35, 0.65, p));
}
`;

const zoomBlur = `
vec4 transition(vec2 uv) {
  float p = easeInOut(uProgress);
  vec2 c = centered(uv);
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float t = float(i) / 7.0;
    float scale = 1.0 + 0.22 * t * (0.4 + p);
    acc += toAt(uncentered(c / scale)).rgb;
  }
  acc /= 8.0;
  vec3 base = fromAt(uncentered(c / (1.0 + 0.35 * p))).rgb;
  return vec4(mix(base, acc, smoothstep(0.2, 0.8, p)), 1.0);
}
`;

const kaleidoscope = `
vec4 transition(vec2 uv) {
  float p = uProgress;
  vec2 c = centered(uv);
  float r = length(c);
  float a = atan(c.y, c.x);
  float seg = PI / 3.0;
  float folded = abs(mod(a, seg) - seg * 0.5);
  vec2 k = vec2(cos(folded), sin(folded)) * r;
  vec2 uvK = uncentered(k);
  float amount = sin(p * PI);
  vec2 uvA = uncentered(mix(c, k, amount * 0.8));
  return mix(fromAt(uvA), toAt(uvK), smoothstep(0.35, 0.65, p));
}
`;

const flip3d = `
vec4 transition(vec2 uv) {
  float p = uProgress;
  float angle = p * PI;
  float c = cos(angle);
  float width = max(abs(c), 0.1);
  float x = abs(uv.x - 0.5);
  float inside = step(x, width * 0.5);
  vec2 sampleUv = vec2(0.5 + (uv.x - 0.5) / width, uv.y);
  vec3 tex = c >= 0.0 ? fromAt(sampleUv).rgb : toAt(sampleUv).rgb;
  vec3 col = tex * inside;
  col *= 0.55 + 0.45 * width;
  float edge = smoothstep(0.006, 0.0, abs(x - width * 0.5));
  col += vec3(edge * 0.35);
  return vec4(col, 1.0);
}
`;

export const TRANSITIONS: TransitionDef[] = [
  {
    id: 'flash',
    name: 'Flash Cut',
    category: 'light',
    description: 'A hard cut wrapped in a white bloom.',
    fragment: flash,
  },
  {
    id: 'slide',
    name: 'Slide',
    category: 'motion',
    description: 'Both frames travel together, one pushing the other out.',
    fragment: slide,
  },
  {
    id: 'glitch',
    name: 'Glitch',
    category: 'glitch',
    description: 'Torn scanlines and colour separation around the seam.',
    fragment: glitch,
  },
  {
    id: 'luma-wipe',
    name: 'Luma Wipe',
    category: 'light',
    description: 'A soft diagonal edge travels across the frame.',
    fragment: lumaWipe,
  },
  {
    id: 'zoom-punch',
    name: 'Zoom Punch',
    category: 'motion',
    description: 'Scale snaps inward with a short flash on impact.',
    fragment: zoomPunch,
  },
  {
    id: 'circle-wipe',
    name: 'Circle Wipe',
    category: 'wipe',
    description: 'A ring opens from the centre and swallows the shot.',
    fragment: circleWipe,
  },
  {
    id: 'whip-pan',
    name: 'Whip Pan',
    category: 'motion',
    description: 'Directional blur sells the speed of a handheld turn.',
    fragment: whipPan,
  },
  {
    id: 'rgb-split',
    name: 'RGB Split',
    category: 'glitch',
    description: 'Channels drift apart, then lock back together.',
    fragment: rgbSplit,
  },
  {
    id: 'film-burn',
    name: 'Film Burn',
    category: 'light',
    description: 'An organic burn eats the frame from the bottom up.',
    fragment: filmBurn,
  },
  {
    id: 'spin',
    name: 'Spin Out',
    category: 'motion',
    description: 'Frames rotate in opposite directions through the cut.',
    fragment: spin,
  },
  {
    id: 'checker',
    name: 'Checker',
    category: 'wipe',
    description: 'Random tiles collapse and rebuild as the next frame.',
    fragment: checker,
  },
  {
    id: 'ripple',
    name: 'Ripple',
    category: 'warp',
    description: 'Concentric waves refract the image as they pass.',
    fragment: ripple,
  },
  {
    id: 'blinds',
    name: 'Blinds',
    category: 'wipe',
    description: 'Horizontal bands slide across at staggered times.',
    fragment: blinds,
  },
  {
    id: 'scanline',
    name: 'Scanline Tear',
    category: 'glitch',
    description: 'Analog rows tear and jitter like a bad tape.',
    fragment: scanline,
  },
  {
    id: 'pixelate',
    name: 'Pixelate',
    category: 'glitch',
    description: 'Resolution collapses to blocks before resolving.',
    fragment: pixelate,
  },
  {
    id: 'flip-3d',
    name: 'Flip 3D',
    category: '3d',
    description: 'The frame turns on its vertical axis to reveal the next.',
    fragment: flip3d,
  },
  {
    id: 'kaleidoscope',
    name: 'Kaleidoscope',
    category: 'warp',
    description: 'Mirrored segments twist the image into a prism.',
    fragment: kaleidoscope,
  },
  {
    id: 'light-leak',
    name: 'Light Leak',
    category: 'light',
    description: 'A warm streak blooms across the cut like exposed film.',
    fragment: lightLeak,
  },
  {
    id: 'clock-wipe',
    name: 'Clock Wipe',
    category: 'light',
    description: 'A radial hand sweeps the old frame away.',
    fragment: clockWipe,
  },
  {
    id: 'curtain',
    name: 'Curtain',
    category: 'wipe',
    description: 'The outgoing frame splits down the middle and opens.',
    fragment: curtain,
  },
  {
    id: 'push-up',
    name: 'Push Up',
    category: 'motion',
    description: 'Vertical push with the same weight as a camera tilt.',
    fragment: pushUp,
  },
  {
    id: 'tile-flip',
    name: 'Tile Flip',
    category: 'wipe',
    description: 'A grid of tiles flips in a loose, shuffled order.',
    fragment: tileFlip,
  },
  {
    id: 'stretch',
    name: 'Stretch',
    category: 'motion',
    description: 'The frame stretches wide, smears, and snaps back.',
    fragment: stretch,
  },
  {
    id: 'swirl',
    name: 'Swirl',
    category: 'warp',
    description: 'A vortex bends both clips through the middle.',
    fragment: swirl,
  },
  {
    id: 'zoom-blur',
    name: 'Zoom Blur',
    category: 'warp',
    description: 'Radial blur pulls the viewer into the next shot.',
    fragment: zoomBlur,
  },
];

export const TRANSITION_IDS: string[] = TRANSITIONS.map((transition) => transition.id);

export function isTransitionId(id: string): id is TransitionId {
  return TRANSITION_IDS.includes(id);
}

export function getTransition(id: string): TransitionDef {
  return TRANSITIONS.find((transition) => transition.id === id) ?? TRANSITIONS[0];
}
