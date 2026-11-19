import { buildFragmentShader, VERTEX_SHADER } from "./transition-shaders";
import type { TransitionDef } from "./transitions";

type Uniforms = {
  from: WebGLUniformLocation | null;
  to: WebGLUniformLocation | null;
  progress: WebGLUniformLocation | null;
  intensity: WebGLUniformLocation | null;
  resolution: WebGLUniformLocation | null;
};

type ProgramEntry = {
  program: WebGLProgram;
  uniforms: Uniforms;
  position: number;
};

function isVideo(source: TexImageSource): source is HTMLVideoElement {
  return typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement;
}

function isImage(source: TexImageSource): source is HTMLImageElement {
  return typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement;
}

function isReady(source: TexImageSource | null): source is TexImageSource {
  if (!source) return false;
  if (isVideo(source)) {
    return source.readyState >= 2 && source.videoWidth > 0;
  }
  if (isImage(source)) {
    return source.complete && source.naturalWidth > 0;
  }
  return true;
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
  label: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Could not create WebGL shader.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed (${label}): ${log ?? 'unknown error'}`);
  }
  return shader;
}

/**
 * WebGL renderer for the clipframes transition shaders.
 * Accepts video, image, or canvas sources (we feed it composed frames).
 */
export class TransitionRenderer {
  readonly canvas: HTMLCanvasElement;

  private gl: WebGLRenderingContext;
  private vertexShader: WebGLShader;
  private quad: WebGLBuffer;
  private textures: [WebGLTexture, WebGLTexture];
  private programs = new Map<string, ProgramEntry>();
  private current: ProgramEntry | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) {
      throw new Error('WebGL is not available in this browser.');
    }

    this.canvas = canvas;
    this.gl = gl;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 1);

    this.vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER, 'vertex');

    const quad = gl.createBuffer();
    if (!quad) throw new Error('Could not create WebGL buffer.');
    this.quad = quad;
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    this.textures = [this.createTexture(), this.createTexture()];
    for (const texture of this.textures) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 255]),
      );
    }
  }

  get effectId(): string | null {
    return this.current ? this.currentId : null;
  }

  private currentId: string | null = null;

  private createTexture(): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) throw new Error('Could not create WebGL texture.');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
  }

  private getProgram(transition: TransitionDef): ProgramEntry {
    const cached = this.programs.get(transition.id);
    if (cached) return cached;

    const gl = this.gl;
    const fragment = compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      buildFragmentShader(transition.fragment),
      transition.id,
    );
    const program = gl.createProgram();
    if (!program) throw new Error('Could not create WebGL program.');
    gl.attachShader(program, this.vertexShader);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(fragment);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program link failed (${transition.id}): ${log ?? 'unknown error'}`);
    }

    const entry: ProgramEntry = {
      program,
      uniforms: {
        from: gl.getUniformLocation(program, 'uFrom'),
        to: gl.getUniformLocation(program, 'uTo'),
        progress: gl.getUniformLocation(program, 'uProgress'),
        intensity: gl.getUniformLocation(program, 'uIntensity'),
        resolution: gl.getUniformLocation(program, 'uResolution'),
      },
      position: gl.getAttribLocation(program, 'aPos'),
    };
    this.programs.set(transition.id, entry);
    return entry;
  }

  setEffect(transition: TransitionDef): void {
    this.current = this.getProgram(transition);
    this.currentId = transition.id;
  }

  setSize(width: number, height: number): void {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
  }

  render(
    from: TexImageSource | null,
    to: TexImageSource | null,
    progress: number,
    intensity = 0.65,
  ): void {
    const gl = this.gl;
    const entry = this.current;
    if (!entry) return;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(entry.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
    if (isReady(from)) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, from);
    }
    gl.uniform1i(entry.uniforms.from, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[1]);
    if (isReady(to)) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, to);
    }
    gl.uniform1i(entry.uniforms.to, 1);

    const p = Math.min(1, Math.max(0, progress));
    gl.uniform1f(entry.uniforms.progress, p);
    gl.uniform1f(entry.uniforms.intensity, Math.min(1, Math.max(0, intensity)));
    gl.uniform2f(entry.uniforms.resolution, this.canvas.width, this.canvas.height);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(entry.position);
    gl.vertexAttribPointer(entry.position, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose(): void {
    const gl = this.gl;
    for (const entry of this.programs.values()) {
      gl.deleteProgram(entry.program);
    }
    this.programs.clear();
    this.current = null;
    this.currentId = null;
    for (const texture of this.textures) gl.deleteTexture(texture);
    gl.deleteBuffer(this.quad);
    gl.deleteShader(this.vertexShader);
  }
}
