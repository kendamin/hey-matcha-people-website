/* ONE continuous "light through ice" ripple field for the whole page (like LNB's page-wide flow field).
   A fixed canvas sits behind the page. The pattern lives in page coordinates, so it scrolls with the
   content, and each section's colours blend into the next over a soft band: no seams at section edges.
   Sections opt in with data-ripple="green|deep|cream|paper|hoji" and a transparent background.
   Reduced motion: still pattern, redrawn only on scroll. No WebGL: sections keep their CSS colours. */
(() => {
  const PAL = {   // background, light colour, strength
    green: ["#236430", "#9ED485", .3],
    deep:  ["#173F20", "#7FBF68", .32],
    cream: ["#ECE9D3", "#9CC47E", .42],
    paper: ["#F5F3E6", "#A9CC8C", .4],
    hoji:  ["#F3EDE0", "#C9A57A", .45],
    soft:  ["#EBE6CA", "#A9CC8C", .24]   // quieter, behind the opening story
  };
  const MAX = 8, BLEND = 220;   // css px over which two sections' colours melt together
  const secs = [...document.querySelectorAll("[data-ripple]")].slice(0, MAX);
  if (!secs.length) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);

  const cv = document.createElement("canvas");
  cv.id = "ripple-field"; cv.setAttribute("aria-hidden", "true");
  Object.assign(cv.style, { position: "fixed", left: 0, top: 0, width: "100%", height: "100lvh", zIndex: -1, pointerEvents: "none" });
  document.body.prepend(cv);
  const gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) { cv.remove(); return; }
  document.documentElement.classList.add("ripple-on");

  const VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  const FS = `precision highp float;
uniform vec2 R; uniform float T, SC, S; uniform int N;
uniform float TOP[${MAX}]; uniform vec3 BG[${MAX}], HI[${MAX}]; uniform float AMT[${MAX}];
void main(){
  float py = SC + (R.y - gl_FragCoord.y) / S;          // page y in css px
  float px = gl_FragCoord.x / S;
  vec3 bg = BG[0], hi = HI[0]; float amt = AMT[0];
  for (int i = 1; i < ${MAX}; i++) {
    if (i >= N) break;
    float k = smoothstep(TOP[i] - ${BLEND}.0 * .5, TOP[i] + ${BLEND}.0 * .5, py);
    bg = mix(bg, BG[i], k); hi = mix(hi, HI[i], k); amt = mix(amt, AMT[i], k);
  }
  vec2 uv = vec2(px, -py) / 520.0 * 1.6;
  float t = T * .18 + 23.;
  vec2 p = mod(uv * 6.2831, 6.2831) - 250., q = p; float c = 1., inten = .005;
  for (int n = 0; n < 5; n++) { float tt = t * (1. - (3.5 / float(n + 1)));
    q = p + vec2(cos(tt - q.x) + sin(tt + q.y), sin(tt - q.y) + cos(tt + q.x));
    c += 1. / length(vec2(p.x / (sin(q.x + tt) / inten), p.y / (cos(q.y + tt) / inten))); }
  c /= 5.; c = 1.17 - pow(c, 1.4); float l = pow(abs(c), 8.);
  gl_FragColor = vec4(mix(bg, hi, clamp(l, 0., 1.) * amt * .8), 1.);
}`;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.warn(gl.getShaderInfoLog && "ripple shader failed"); cv.remove(); document.documentElement.classList.remove("ripple-on"); return; }
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(pr, n);
  const uR = U("R"), uT = U("T"), uSC = U("SC"), uS = U("S"), uN = U("N"), uTOP = U("TOP");

  // section colours (fixed) and section tops (re-measured on resize / layout change)
  const pals = secs.map(s => PAL[s.dataset.ripple] || PAL.green);
  gl.uniform3fv(U("BG"), new Float32Array(pals.flatMap(p => rgb(p[0])).concat(Array((MAX - pals.length) * 3).fill(0))));
  gl.uniform3fv(U("HI"), new Float32Array(pals.flatMap(p => rgb(p[1])).concat(Array((MAX - pals.length) * 3).fill(0))));
  gl.uniform1fv(U("AMT"), new Float32Array(pals.map(p => p[2]).concat(Array(MAX - pals.length).fill(0))));
  gl.uniform1i(uN, secs.length);
  const measure = () => {
    const tops = secs.map(s => s.getBoundingClientRect().top + scrollY);
    gl.uniform1fv(uTOP, new Float32Array(tops.concat(Array(MAX - tops.length).fill(1e9))));
  };
  let scale = 1;
  const size = () => {
    scale = .5 * Math.min(devicePixelRatio || 1, 2);   // soft pattern: half resolution is plenty
    cv.width = Math.max(64, Math.round(cv.clientWidth * scale)); cv.height = Math.max(64, Math.round(cv.clientHeight * scale));
    gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uS, scale);
    measure();
  };
  const draw = now => { gl.uniform1f(uT, reduce ? 0 : now / 1000); gl.uniform1f(uSC, scrollY); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  size();
  addEventListener("resize", size);
  new ResizeObserver(measure).observe(document.body);
  if (reduce) { draw(0); addEventListener("scroll", () => requestAnimationFrame(draw), { passive: true }); return; }
  (function loop(t) { draw(t); requestAnimationFrame(loop); })(performance.now());
})();
