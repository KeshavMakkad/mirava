/**
 * MIRAVA orbital atlas (ported from the new explore.html "mirava-globe-script"):
 * a native WebGL globe centred on India, with no runtime dependencies. The map
 * texture that was inlined as base64 now lives at /images/mirava-globe-map.png.
 *
 * It also owns the page-wide "pause motion" state, exactly like the original:
 * the #miravaMotionToggle button flips `mirava-motion-paused` (on the page
 * scope instead of <html>) and dispatches `mirava:motionchange` on document.
 */
export const MOTION_EVENT = 'mirava:motionchange'
const MAP_URL = '/images/mirava-globe-map.png'

interface Program {
  program: WebGLProgram
  aPosition: number
  aUV: number
  uMVP: WebGLUniformLocation | null
  uModel: WebGLUniformLocation | null
  uMap: WebGLUniformLocation | null
  uColor: WebGLUniformLocation | null
  uSize: WebGLUniformLocation | null
}
interface Shape {
  buffer: WebGLBuffer
  count: number
}

const globeVertex = `
    attribute vec3 aPosition;
    attribute vec2 aUV;
    uniform mat4 uMVP;
    uniform mat4 uModel;
    varying vec2 vUV;
    varying vec3 vNormal;
    varying vec3 vWorld;
    void main() {
      vUV=aUV;
      vNormal=mat3(uModel)*aPosition;
      vWorld=(uModel*vec4(aPosition,1.0)).xyz;
      gl_Position=uMVP*vec4(aPosition,1.0);
    }
  `
const globeFragment = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    varying vec2 vUV;
    varying vec3 vNormal;
    varying vec3 vWorld;
    uniform sampler2D uMap;
    float hash(vec2 p) { p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
    float noise(vec2 p) {
      vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
    }
    float terrainNoise(vec2 p) {
      float value=noise(p)*0.5;
      value+=noise(p*2.03+7.1)*0.25;
      value+=noise(p*4.11+2.8)*0.125;
      value+=noise(p*8.15+11.7)*0.0625;
      return value;
    }
    void main() {
      vec3 n=normalize(vNormal);
      vec3 eye=normalize(vec3(0.0,0.0,5.35)-vWorld);
      vec3 sun=normalize(vec3(-0.85,0.75,0.95));
      vec3 tex=texture2D(uMap,vUV).rgb;
      float mask=smoothstep(0.14,0.40,dot(tex,vec3(0.299,0.587,0.114)));
      float terrain=smoothstep(0.05,0.86,terrainNoise(vUV*vec2(90.0,45.0)));
      float grain=hash(floor(vUV*vec2(2304.0,1152.0)));
      vec3 ocean=vec3(0.026,0.044,0.056);
      vec3 land=mix(vec3(0.36,0.27,0.15),vec3(0.59,0.46,0.28),terrain);
      vec3 base=mix(ocean,land,mask);
      float diffuse=max(dot(n,sun),0.0);
      float lighting=0.13+1.22*diffuse;
      vec3 color=base*lighting;
      color+=mask*(grain-0.5)*0.035;
      float grid=max(pow(1.0-abs(sin(vUV.y*37.6991)),100.0),pow(1.0-abs(sin(vUV.x*75.3982)),100.0));
      color=mix(color,vec3(0.60,0.47,0.27)*lighting,grid*0.055);
      float spec=pow(max(dot(n,normalize(sun+eye)),0.0),60.0);
      color+=vec3(0.78,0.67,0.48)*spec*(0.13+0.19*(1.0-mask));
      float rim=pow(1.0-max(dot(n,eye),0.0),3.0);
      color+=vec3(0.39,0.43,0.43)*rim*(0.14+0.32*diffuse);
      color+=vec3(0.046,0.035,0.027)*pow(1.0-max(dot(n,eye),0.0),1.6);
      gl_FragColor=vec4(color,1.0);
    }
  `
const atmosphereFragment = `
    precision mediump float;
    varying vec3 vNormal;
    varying vec3 vWorld;
    void main() {
      vec3 n=normalize(vNormal);
      vec3 eye=normalize(vec3(0.0,0.0,5.35)-vWorld);
      float rim=pow(1.0-abs(dot(n,eye)),4.0);
      float light=0.45+0.55*max(dot(n,normalize(vec3(-0.65,0.7,1.25))),0.0);
      gl_FragColor=vec4(vec3(0.77,0.67,0.46),rim*0.28*light);
    }
  `
const lineVertex = `
    attribute vec3 aPosition;
    uniform mat4 uMVP;
    uniform float uSize;
    void main() { gl_Position=uMVP*vec4(aPosition,1.0); gl_PointSize=uSize; }
  `
const lineFragment = `
    precision mediump float;
    uniform vec4 uColor;
    void main() { gl_FragColor=uColor; }
  `
const pointFragment = `
    precision mediump float;
    uniform vec4 uColor;
    void main() {
      float d=distance(gl_PointCoord,vec2(0.5));
      float alpha=1.0-smoothstep(0.12,0.5,d);
      gl_FragColor=vec4(uColor.rgb,uColor.a*alpha);
    }
  `

const identity = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
function multiply(a: Float32Array, b: Float32Array) {
  const out = new Float32Array(16)
  for (let col = 0; col < 4; col++)
    for (let row = 0; row < 4; row++)
      out[col * 4 + row] =
        a[row] * b[col * 4] + a[4 + row] * b[col * 4 + 1] + a[8 + row] * b[col * 4 + 2] + a[12 + row] * b[col * 4 + 3]
  return out
}
function rotateX(a: number) {
  const c = Math.cos(a), s = Math.sin(a)
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1])
}
function rotateY(a: number) {
  const c = Math.cos(a), s = Math.sin(a)
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1])
}
function rotateZ(a: number) {
  const c = Math.cos(a), s = Math.sin(a)
  return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
}
function scale(a: number) {
  return new Float32Array([a, 0, 0, 0, 0, a, 0, 0, 0, 0, a, 0, 0, 0, 0, 1])
}
function perspective(fov: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far)
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0])
}

/** Toggles a "document-level" class on the page scope (what the original put on <html>). */
export type ClassToggle = (name: string, on: boolean) => void

export function mountGlobe(page: HTMLElement, setRootClass: ClassToggle): () => void {
  const host = page.querySelector<HTMLElement>('#miravaOrbit')
  const canvas = page.querySelector<HTMLCanvasElement>('#miravaGlobe')
  if (!host || !canvas) return () => {}
  const hero = page.querySelector<HTMLElement>('#top') || host
  const resetButton = page.querySelector<HTMLButtonElement>('#miravaOrbitReset')
  const motionButton = page.querySelector<HTMLButtonElement>('#miravaMotionToggle')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const coarse = matchMedia('(pointer: coarse)')
  const cleanups: (() => void)[] = []
  const on = <K extends string>(target: EventTarget, type: K, fn: EventListener, opts?: AddEventListenerOptions) => {
    target.addEventListener(type, fn, opts)
    cleanups.push(() => target.removeEventListener(type, fn, opts))
  }

  let paused = reduced.matches
  let visible = true
  let suspended = false
  let ready = false
  let lost = false
  let disposed = false
  let frame = 0
  let previousTime = 0
  let clock = 0
  let gl: WebGLRenderingContext | null = null
  let resource: {
    globe: Program
    atmosphere: Program
    line: Program
    point: Program
    vertex: WebGLBuffer
    uv: WebGLBuffer
    index: WebGLBuffer
    indexCount: number
    rings: Shape[]
    stars: Shape
    pin: Shape
    pinCoords: number[]
    texture: WebGLTexture
  } | null = null
  let mapImage: HTMLImageElement | null = null
  const DEG = Math.PI / 180
  const initialYaw = -78.9 * DEG
  const initialPitch = 22.6 * DEG
  let targetYaw = initialYaw
  let targetPitch = initialPitch
  let yaw = targetYaw
  let pitch = targetPitch
  let manipulated = false
  let pointer: { id: number; x: number; y: number; lastX: number; lastY: number; intent: boolean } | null = null
  let projection: Float32Array | null = null
  const view = identity()
  view[14] = -5.35

  function announceMotion() {
    setRootClass('mirava-motion-paused', paused)
    if (motionButton) {
      motionButton.setAttribute('aria-pressed', String(paused))
      motionButton.setAttribute('aria-label', paused ? 'Resume motion' : 'Pause motion')
      const label = motionButton.querySelector('[data-motion-label]') || motionButton
      label.textContent = paused ? 'Resume motion' : 'Pause motion'
    }
    host!.dataset.motion = paused ? 'paused' : 'playing'
    document.dispatchEvent(new CustomEvent(MOTION_EVENT, { detail: { paused } }))
    previousTime = 0
    requestFrame()
  }
  if (motionButton)
    on(motionButton, 'click', () => {
      paused = !paused
      announceMotion()
    })
  on(reduced, 'change', () => {
    paused = reduced.matches
    announceMotion()
  })

  function fallback() {
    ready = false
    cancelAnimationFrame(frame)
    frame = 0
    host!.dataset.state = 'static'
    host!.dataset.renderer = 'static'
    canvas!.setAttribute('aria-hidden', 'true')
    canvas!.tabIndex = -1
    if (resetButton) resetButton.disabled = true
  }
  function markReady() {
    ready = true
    host!.dataset.state = 'ready'
    host!.dataset.renderer = 'webgl'
    canvas!.removeAttribute('aria-hidden')
    canvas!.tabIndex = 0
    canvas!.setAttribute('role', 'img')
    canvas!.setAttribute(
      'aria-label',
      'Interactive heritage globe. Drag horizontally or use the arrow keys to rotate. Press Home to return to India.',
    )
    if (resetButton) resetButton.disabled = false
    resize()
    requestFrame()
  }

  function shader(type: number, source: string) {
    const s = gl!.createShader(type)!
    gl!.shaderSource(s, source)
    gl!.compileShader(s)
    if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
      gl!.deleteShader(s)
      throw new Error('WebGL shader unavailable')
    }
    return s
  }
  function program(vs: string, fs: string): Program {
    const g = gl!
    const p = g.createProgram()!, v = shader(g.VERTEX_SHADER, vs), f = shader(g.FRAGMENT_SHADER, fs)
    g.attachShader(p, v)
    g.attachShader(p, f)
    g.linkProgram(p)
    g.deleteShader(v)
    g.deleteShader(f)
    if (!g.getProgramParameter(p, g.LINK_STATUS)) {
      g.deleteProgram(p)
      throw new Error('WebGL program unavailable')
    }
    return {
      program: p,
      aPosition: g.getAttribLocation(p, 'aPosition'),
      aUV: g.getAttribLocation(p, 'aUV'),
      uMVP: g.getUniformLocation(p, 'uMVP'),
      uModel: g.getUniformLocation(p, 'uModel'),
      uMap: g.getUniformLocation(p, 'uMap'),
      uColor: g.getUniformLocation(p, 'uColor'),
      uSize: g.getUniformLocation(p, 'uSize'),
    }
  }
  function buffer(data: BufferSource, target?: number) {
    const g = gl!
    const tgt = target ?? g.ARRAY_BUFFER
    const b = g.createBuffer()!
    g.bindBuffer(tgt, b)
    g.bufferData(tgt, data, g.STATIC_DRAW)
    return b
  }
  function positions(data: number[]): Shape {
    return { buffer: buffer(new Float32Array(data)), count: data.length / 3 }
  }
  function orbit(radius: number, segments = 320, dashed = false, lean = 0) {
    const p: number[] = []
    for (let i = 0; i < segments; i++) {
      if (dashed && i % 8 > 3) continue
      for (const a of [(i / segments) * Math.PI * 2, ((i + 1) / segments) * Math.PI * 2])
        p.push(Math.cos(a) * radius, Math.sin(a) * lean, Math.sin(a) * radius)
    }
    return positions(p)
  }
  function setup() {
    const g = gl!
    const verts: number[] = [], uv: number[] = [], indices: number[] = [], segments = 112, rings = 72
    for (let i = 0; i <= rings; i++) {
      const lat = (i / rings - 0.5) * Math.PI
      for (let j = 0; j <= segments; j++) {
        const lon = (j / segments - 0.5) * Math.PI * 2
        verts.push(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon))
        uv.push(j / segments, i / rings)
      }
    }
    for (let i = 0; i < rings; i++)
      for (let j = 0; j < segments; j++) {
        const a = i * (segments + 1) + j, b = a + segments + 1
        indices.push(a, a + 1, b, a + 1, b + 1, b)
      }
    let seed = 2741
    const rand = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }
    const stars: number[] = []
    for (let i = 0; i < 75; i++) stars.push((rand() - 0.5) * 9, (rand() - 0.5) * 8, -2 - rand() * 3)
    const markerLat = 22.6 * DEG, markerLon = 78.9 * DEG
    const pin = [Math.cos(markerLat) * Math.sin(markerLon), Math.sin(markerLat), Math.cos(markerLat) * Math.cos(markerLon)]
    const texture = g.createTexture()!
    g.bindTexture(g.TEXTURE_2D, texture)
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR)
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR)
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE)
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE)
    resource = {
      globe: program(globeVertex, globeFragment),
      atmosphere: program(globeVertex, atmosphereFragment),
      line: program(lineVertex, lineFragment),
      point: program(lineVertex, pointFragment),
      vertex: buffer(new Float32Array(verts)),
      uv: buffer(new Float32Array(uv)),
      index: buffer(new Uint16Array(indices), g.ELEMENT_ARRAY_BUFFER),
      indexCount: indices.length,
      rings: [orbit(1.92), orbit(2.04, 320, true), orbit(1.76, 320, false, 0.1)],
      stars: positions(stars),
      pin: positions(pin.map((v) => v * 1.016)),
      pinCoords: pin,
      texture,
    }
    g.enable(g.DEPTH_TEST)
    g.depthFunc(g.LEQUAL)
    g.enable(g.CULL_FACE)
    g.cullFace(g.BACK)
    g.clearColor(0, 0, 0, 0)
    uploadTexture()
  }
  function uploadTexture() {
    if (!mapImage?.complete || !mapImage.naturalWidth || !resource || lost || disposed) return
    const g = gl!
    g.bindTexture(g.TEXTURE_2D, resource.texture)
    g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, true)
    g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, mapImage)
    markReady()
  }
  function setPosition(p: Program, b: WebGLBuffer) {
    const g = gl!
    g.bindBuffer(g.ARRAY_BUFFER, b)
    g.enableVertexAttribArray(p.aPosition)
    g.vertexAttribPointer(p.aPosition, 3, g.FLOAT, false, 0, 0)
  }
  function sphere(p: Program, model: Float32Array) {
    const g = gl!, r = resource!
    g.useProgram(p.program)
    setPosition(p, r.vertex)
    if (p.aUV >= 0) {
      g.bindBuffer(g.ARRAY_BUFFER, r.uv)
      g.enableVertexAttribArray(p.aUV)
      g.vertexAttribPointer(p.aUV, 2, g.FLOAT, false, 0, 0)
    }
    g.uniformMatrix4fv(p.uModel, false, model)
    g.uniformMatrix4fv(p.uMVP, false, multiply(projection!, multiply(view, model)))
    if (p.uMap) {
      g.activeTexture(g.TEXTURE0)
      g.bindTexture(g.TEXTURE_2D, r.texture)
      g.uniform1i(p.uMap, 0)
    }
    g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, r.index)
    g.drawElements(g.TRIANGLES, r.indexCount, g.UNSIGNED_SHORT, 0)
  }
  function lines(p: Program, shape: Shape, matrix: Float32Array, color: number[], size: number, mode: number) {
    const g = gl!
    g.useProgram(p.program)
    setPosition(p, shape.buffer)
    if (p.aUV >= 0) g.disableVertexAttribArray(p.aUV)
    g.uniformMatrix4fv(p.uMVP, false, matrix)
    g.uniform4fv(p.uColor, color)
    g.uniform1f(p.uSize, size)
    g.drawArrays(mode, 0, shape.count)
  }
  function render() {
    if (!ready || lost || !projection || !gl || !resource) return
    const g = gl, r = resource
    g.viewport(0, 0, canvas!.width, canvas!.height)
    g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT)
    const pv = multiply(projection, view)
    const drift = manipulated ? 0 : Math.sin(clock * 0.12) * 0.12
    const float = manipulated ? 0 : Math.sin(clock * 0.16) * 0.018
    const rotation = multiply(rotateX(pitch + float), rotateY(yaw + drift))
    const model = multiply(rotation, scale(1.48))
    g.depthMask(false)
    g.enable(g.BLEND)
    g.blendFunc(g.SRC_ALPHA, g.ONE)
    lines(r.point, r.stars, pv, [0.76, 0.68, 0.5, 0.5], Math.min(devicePixelRatio || 1, 1.5) * 1.8, g.POINTS)
    g.disable(g.BLEND)
    g.depthMask(true)
    g.cullFace(g.BACK)
    sphere(r.globe, model)
    g.enable(g.BLEND)
    g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA)
    g.depthMask(false)
    const ringModel = multiply(rotateZ(-23 * DEG), rotateX(47 * DEG + Math.sin(clock * 0.1) * 0.013))
    const ringMatrix = multiply(pv, ringModel)
    lines(r.line, r.rings[0], ringMatrix, [0.79, 0.62, 0.36, 0.57], 1, g.LINES)
    lines(r.line, r.rings[1], ringMatrix, [0.71, 0.56, 0.32, 0.23], 1, g.LINES)
    lines(r.line, r.rings[2], multiply(pv, multiply(rotateZ(36 * DEG), rotateX(-30 * DEG))), [0.75, 0.63, 0.41, 0.14], 1, g.LINES)
    g.blendFunc(g.SRC_ALPHA, g.ONE)
    g.cullFace(g.FRONT)
    sphere(r.atmosphere, multiply(rotation, scale(1.515)))
    g.cullFace(g.BACK)
    const pinMVP = multiply(pv, model), dpr = Math.min(devicePixelRatio || 1, coarse.matches ? 1.25 : 1.5)
    lines(r.point, r.pin, pinMVP, [1, 0.64, 0.19, 0.3], dpr * 23, g.POINTS)
    lines(r.point, r.pin, pinMVP, [1, 0.78, 0.4, 1], dpr * 7, g.POINTS)
    g.depthMask(true)
    g.disable(g.BLEND)

    // DOM labels follow the geographically anchored India marker.
    const v = r.pinCoords.map((n) => n * 1.016), m = pinMVP
    const x = m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12]
    const y = m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13]
    const w = m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15]
    const zWorld = model[2] * v[0] + model[6] * v[1] + model[10] * v[2]
    host!.style.setProperty('--pin-x', ((x / w) * 0.5 + 0.5) * 100 + '%')
    host!.style.setProperty('--pin-y', ((-0.5 * y) / w + 0.5) * 100 + '%')
    host!.style.setProperty('--pin-visible', zWorld > 0.42 ? '1' : '0')
  }

  function requestFrame() {
    if (!frame && ready && visible && !document.hidden && !suspended && !lost && !disposed) frame = requestAnimationFrame(tick)
  }
  function tick(now: number) {
    frame = 0
    if (!ready || !visible || document.hidden || suspended || lost) {
      previousTime = 0
      return
    }
    const dt = previousTime ? Math.min((now - previousTime) / 1000, 0.05) : 1 / 60
    previousTime = now
    if (!paused) clock += dt
    const easing = paused ? 1 : 1 - Math.exp(-dt * 10)
    yaw += (targetYaw - yaw) * easing
    pitch += (targetPitch - pitch) * easing
    render()
    if (!paused || Math.abs(targetYaw - yaw) + Math.abs(targetPitch - pitch) > 0.0001) requestFrame()
  }
  function resize() {
    const box = canvas!.getBoundingClientRect()
    if (!box.width || !box.height) return
    const dpr = Math.min(devicePixelRatio || 1, coarse.matches ? 1.25 : 1.5)
    const width = Math.max(1, Math.round(box.width * dpr)), height = Math.max(1, Math.round(box.height * dpr))
    if (canvas!.width !== width || canvas!.height !== height) {
      canvas!.width = width
      canvas!.height = height
    }
    const aspect = width / height
    const fov = 2 * Math.atan(Math.tan(23 * DEG) * Math.max(1, 1 / aspect))
    projection = perspective(fov, aspect, 0.1, 30)
    requestFrame()
  }
  function reset() {
    targetYaw = initialYaw
    targetPitch = initialPitch
    clock = 0
    manipulated = false
    requestFrame()
  }
  if (resetButton) on(resetButton, 'click', reset)
  on(canvas, 'dblclick', reset)
  canvas.style.touchAction = 'pan-y'
  on(canvas, 'pointerdown', ((e: PointerEvent) => {
    if (!ready || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return
    pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, intent: e.pointerType !== 'touch' }
    if (pointer.intent) canvas.setPointerCapture(e.pointerId)
  }) as EventListener)
  on(canvas, 'pointermove', ((e: PointerEvent) => {
    if (!pointer || e.pointerId !== pointer.id) return
    const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y
    if (!pointer.intent) {
      if (Math.abs(dy) > 9 && Math.abs(dy) > Math.abs(dx)) {
        pointer = null
        return
      }
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) return
      pointer.intent = true
      canvas.setPointerCapture(e.pointerId)
    }
    manipulated = true
    targetYaw += (e.clientX - pointer.lastX) * 0.006
    targetPitch = Math.max(-1.05, Math.min(1.05, targetPitch + (e.clientY - pointer.lastY) * 0.004))
    pointer.lastX = e.clientX
    pointer.lastY = e.clientY
    host.classList.add('is-orbiting')
    requestFrame()
  }) as EventListener)
  const releasePointer = ((e: PointerEvent) => {
    if (pointer && e.pointerId === pointer.id) {
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
      pointer = null
      host.classList.remove('is-orbiting')
    }
  }) as EventListener
  on(canvas, 'pointerup', releasePointer)
  on(canvas, 'pointercancel', releasePointer)
  on(canvas, 'lostpointercapture', () => {
    pointer = null
    host.classList.remove('is-orbiting')
  })
  on(canvas, 'keydown', ((e: KeyboardEvent) => {
    if (!ready) return
    if (e.key === 'Home') {
      e.preventDefault()
      reset()
      return
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
    e.preventDefault()
    e.stopPropagation()
    manipulated = true
    if (e.key === 'ArrowLeft') targetYaw -= 12 * DEG
    if (e.key === 'ArrowRight') targetYaw += 12 * DEG
    if (e.key === 'ArrowUp') targetPitch = Math.max(-1.05, targetPitch - 7 * DEG)
    if (e.key === 'ArrowDown') targetPitch = Math.min(1.05, targetPitch + 7 * DEG)
    requestFrame()
  }) as EventListener)

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    cleanups.push(() => ro.disconnect())
  } else on(window, 'resize', resize, { passive: true })
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting
        if (!visible) {
          cancelAnimationFrame(frame)
          frame = 0
          previousTime = 0
        } else requestFrame()
      },
      { threshold: 0 },
    )
    io.observe(hero)
    cleanups.push(() => io.disconnect())
  }
  on(document, 'visibilitychange', () => {
    previousTime = 0
    if (document.hidden) {
      cancelAnimationFrame(frame)
      frame = 0
    } else requestFrame()
  })
  on(window, 'pagehide', () => {
    suspended = true
    cancelAnimationFrame(frame)
    frame = 0
  })
  on(window, 'pageshow', () => {
    suspended = false
    previousTime = 0
    requestFrame()
  })
  on(canvas, 'webglcontextlost', (e) => {
    e.preventDefault()
    lost = true
    fallback()
  })
  on(canvas, 'webglcontextrestored', () => {
    lost = false
    try {
      setup()
    } catch {
      fallback()
    }
  })

  announceMotion()
  try {
    gl =
      canvas.getContext('webgl', { alpha: true, antialias: !coarse.matches, premultipliedAlpha: false, powerPreference: 'low-power' }) ||
      (canvas.getContext('experimental-webgl', { alpha: true, antialias: false }) as WebGLRenderingContext | null)
    if (!gl) fallback()
    else {
      setup()
      mapImage = new Image()
      mapImage.onload = () => {
        try {
          uploadTexture()
        } catch {
          fallback()
        }
      }
      mapImage.onerror = fallback
      mapImage.src = MAP_URL
    }
  } catch {
    fallback()
  }

  return () => {
    disposed = true
    cancelAnimationFrame(frame)
    frame = 0
    if (mapImage) {
      mapImage.onload = null
      mapImage.onerror = null
    }
    cleanups.forEach((fn) => fn())
    setRootClass('mirava-motion-paused', false)
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  }
}
