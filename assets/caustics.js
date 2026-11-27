/* Light through ice: soft caustic light patterns drifting over a section, like sun through a
   clear cup of iced matcha. <section data-caustics>. Low-res WebGL, on-screen only,
   reduced motion = one still frame, no WebGL = plain background. */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  const FS = `precision mediump float;uniform vec2 R;uniform float T;uniform vec3 BG,HI;uniform float AMT;
void main(){
  vec2 uv=gl_FragCoord.xy/R.y*1.6;
  float t=T*.18+23.;
  vec2 p=mod(uv*6.2831,6.2831)-250., i=p; float c=1., inten=.005;
  for(int n=0;n<5;n++){float tt=t*(1.-(3.5/float(n+1)));
    i=p+vec2(cos(tt-i.x)+sin(tt+i.y),sin(tt-i.y)+cos(tt+i.x));
    c+=1./length(vec2(p.x/(sin(i.x+tt)/inten),p.y/(cos(i.y+tt)/inten)));}
  c/=5.; c=1.17-pow(c,1.4); float l=pow(abs(c),8.);
  vec3 bg=BG, hi=HI;
  float v=smoothstep(0.,1.,gl_FragCoord.y/R.y);          // brighter toward the top, like light from above
  gl_FragColor=vec4(mix(bg,hi,clamp(l,0.,1.)*AMT*(.55+.45*v)),1.);
}`;
  // per-section colours: background, light colour, strength. <section data-caustics="cream">
  const PAL = {
    green: ["#236430", "#9ED485", .3],
    deep:  ["#173F20", "#7FBF68", .32],
    cream: ["#ECE9D3", "#9CC47E", .42],
    paper: ["#F5F3E6", "#A9CC8C", .4],
    hoji:  ["#F3EDE0", "#C9A57A", .45]   // warm hojicha tan
  };
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  document.querySelectorAll("[data-caustics]").forEach(sec => {
    const pal = PAL[sec.dataset.caustics] || PAL.green;
    const cv = document.createElement("canvas"); cv.className = "lava-cv"; cv.setAttribute("aria-hidden", "true"); sec.prepend(cv);
    const gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) { cv.remove(); return; }
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { cv.remove(); return; }
    gl.useProgram(pr); gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(pr, "R"), uT = gl.getUniformLocation(pr, "T");
    gl.uniform3fv(gl.getUniformLocation(pr, "BG"), rgb(pal[0])); gl.uniform3fv(gl.getUniformLocation(pr, "HI"), rgb(pal[1])); gl.uniform1f(gl.getUniformLocation(pr, "AMT"), pal[2]);
    let on = false;
    const size = () => { cv.width = Math.max(64, Math.round(cv.clientWidth * .5)); cv.height = Math.max(64, Math.round(cv.clientHeight * .5)); gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(uR, cv.width, cv.height); };
    const draw = now => { gl.uniform1f(uT, now / 1000); gl.drawArrays(gl.TRIANGLES, 0, 3); if (on && !reduce) requestAnimationFrame(draw); };
    size(); new ResizeObserver(() => { size(); if (reduce) draw(0); }).observe(cv);
    if (reduce) { draw(0); return; }
    new IntersectionObserver(([e]) => { const was = on; on = e.isIntersecting; if (on && !was) requestAnimationFrame(draw); }).observe(sec);
  });
})();
