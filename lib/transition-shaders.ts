export const VERTEX_SHADER = `
attribute vec2 aPos;
varying vec2 vUv;

void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const SHADER_HEADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform float uProgress;
uniform float uIntensity;
uniform vec2 uResolution;
varying vec2 vUv;

const float PI = 3.141592653589793;

float easeInOut(float x) {
  return x * x * (3.0 - 2.0 * x);
}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise21(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec2 rot2(vec2 v, float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c) * v;
}

vec2 centered(vec2 uv) {
  vec2 p = uv - 0.5;
  p.x *= uResolution.x / max(uResolution.y, 1.0);
  return p;
}

vec2 uncentered(vec2 p) {
  p.x /= uResolution.x / max(uResolution.y, 1.0);
  return p + 0.5;
}

vec4 fromAt(vec2 uv) {
  return texture2D(uFrom, clamp(uv, vec2(0.001), vec2(0.999)));
}

vec4 toAt(vec2 uv) {
  return texture2D(uTo, clamp(uv, vec2(0.001), vec2(0.999)));
}

vec4 blurFrom(vec2 uv, float amount) {
  vec4 sum = vec4(0.0);
  for (int i = -2; i <= 2; i++) {
    sum += fromAt(uv + vec2(float(i) * amount, 0.0));
  }
  return sum / 5.0;
}

vec4 blurTo(vec2 uv, float amount) {
  vec4 sum = vec4(0.0);
  for (int i = -2; i <= 2; i++) {
    sum += toAt(uv + vec2(float(i) * amount, 0.0));
  }
  return sum / 5.0;
}
`;

export function buildFragmentShader(body: string): string {
  return `${SHADER_HEADER}\n${body}\nvoid main() {\n  gl_FragColor = transition(vUv);\n}\n`;
}
