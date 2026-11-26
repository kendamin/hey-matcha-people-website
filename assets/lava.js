/* Matcha lava lamp: soft gooey blobs melting into each other behind a section.
   Usage: <section data-lava="green|cream|night|paper">. One small WebGL canvas per section,
   drawn at low resolution (the blobs are soft, so it upscales cleanly), only while on screen.
   Reduced motion: one still frame. No WebGL: the section keeps its plain colour. */
(() => {
  const PAL = {           // background, blob A, blob B, highlight
    green: ["#236430", "#2F7B3B", "#1A5226", "#5FA552"],
    night: ["#0F2A15", "#1A4A22", "#123A1A", "#2F6A35"],
    cream: ["#ECE9D3", "#D6E3B8", "#E6D6B6", "#F7F4E6"],
    paper: ["#F5F3E6", "#DFEBC6", "#F0E2C2", "#FFFFFF"],
    ube:   ["#ECE9D3", "#DCCDE6", "#F0DCA8", "#FBF7EE"]   // ube purple + leche flan gold
  };
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover:hover) and (pointer:fine)").matches;

  const VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  const FS = `precision mediump float;
uniform vec2 R;uniform float T;uniform vec2 M;uniform float MI;
uniform vec3 C0,C1,C2,C3;
float blob(vec2 uv,vec2 c,float r){vec2 d=uv-c;return r*r/(dot(d,d)+1e-4);}
void main(){
  vec2 uv=gl_FragCoord.xy/R; float a=R.x/R.y; uv.x*=a;
  float t=T*.06, fa=0., fb=0.;
  // set A: rising matcha blobs
  for(int i=0;i<5;i++){float k=float(i);
    vec2 c=vec2((.5+.38*sin(t*(.7+k*.13)+k*2.1))*a,.5+.62*sin(t*(.45+k*.09)+k*1.7));
    fa+=blob(uv,c,.15+.04*sin(k*3.+t));}
  // set B: cream / hojicha blobs drifting the other way
  for(int i=0;i<4;i++){float k=float(i)+7.;
    vec2 c=vec2((.5+.42*cos(t*(.5+k*.05)+k))*a,.5-.6*sin(t*(.38+k*.04)+k*1.3));
    fb+=blob(uv,c,.14+.04*cos(k+t*.7));}
  fa+=MI*blob(uv,vec2(M.x*a,M.y),.13);           // one blob follows the pointer
  float ea=smoothstep(1.,1.12,fa), eb=smoothstep(1.,1.12,fb);
  vec3 col=mix(C0,C2,eb);
  col=mix(col,C1,ea);
  float rim=smoothstep(1.2,4.,fa)*.45+smoothstep(1.2,4.,fb)*.3;
  float edge=(smoothstep(.92,1.,fa)-smoothstep(1.,1.12,fa))+(smoothstep(.92,1.,fb)-smoothstep(1.,1.12,fb));  // squishy inner glow
  col=mix(col,C3,rim*.5);
  col=mix(col,C3,clamp(edge,0.,1.)*.18);
  gl_FragColor=vec4(col,1.);
}`;

  function start(sec) {
    const pal = (PAL[sec.dataset.lava] || PAL.green).map(rgb);
    const cv = document.createElement("canvas");
    cv.className = "lava-cv"; cv.setAttribute("aria-hidden", "true");
    sec.prepend(cv);
    const gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) { cv.remove(); return; }
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { cv.remove(); return; }
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = n => gl.getUniformLocation(pr, n);
    ["C0", "C1", "C2", "C3"].forEach((n, i) => gl.uniform3fv(U(n), pal[i]));
    const uR = U("R"), uT = U("T"), uM = U("M"), uMI = U("MI");
    const seed = Math.random() * 100;
    let on = false, mx = .5, my = .5, tx = .5, ty = .5, mi = 0, ti = 0;
    const size = () => {
      const s = .6;   // low-res: soft blobs upscale cleanly and cost almost nothing
      cv.width = Math.max(64, Math.round(cv.clientWidth * s)); cv.height = Math.max(64, Math.round(cv.clientHeight * s));
      gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(uR, cv.width, cv.height);
    };
    const draw = now => {
      mx += (tx - mx) * .05; my += (ty - my) * .05; mi += (ti - mi) * .04;
      gl.uniform1f(uT, seed + now / 1000); gl.uniform2f(uM, mx, my); gl.uniform1f(uMI, mi);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (on && !reduce) requestAnimationFrame(draw);
    };
    size(); new ResizeObserver(() => { size(); if (reduce) draw(0); }).observe(cv);
    if (fine && !reduce) {
      sec.addEventListener("pointermove", e => { const r = sec.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width; ty = 1 - (e.clientY - r.top) / r.height; ti = 1; });
      sec.addEventListener("pointerleave", () => { ti = 0; });
    }
    if (reduce) { draw(0); return; }
    new IntersectionObserver(([e]) => { const was = on; on = e.isIntersecting; if (on && !was) requestAnimationFrame(draw); }).observe(sec);
  }
  document.querySelectorAll("[data-lava]").forEach(start);
})();
