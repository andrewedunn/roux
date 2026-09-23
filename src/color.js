// ABOUTME: Color math for the game: hex <-> sRGB <-> OKLab, perceptual distance, and mixing.
// ABOUTME: OKLab is used everywhere colors are compared or blended so steps look even to the eye.

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('');
}

export function hexToOklab(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => srgbToLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

export function oklabToHex({ L, a, b }) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return rgbToHex(rgb.map((v) => linearToSrgb(Math.max(0, Math.min(1, v))) * 255));
}

export function deltaE(hexA, hexB) {
  const p = hexToOklab(hexA);
  const q = hexToOklab(hexB);
  return Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);
}

export function mixHex(hexA, hexB, t) {
  const p = hexToOklab(hexA);
  const q = hexToOklab(hexB);
  return oklabToHex({
    L: p.L + (q.L - p.L) * t,
    a: p.a + (q.a - p.a) * t,
    b: p.b + (q.b - p.b) * t,
  });
}
