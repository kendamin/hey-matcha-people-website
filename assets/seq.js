/* Frame-sequence player for scroll scrubbing (Ken's Flow clips cut into WebP frames).
   Seq.load(name, count, base) -> { frame(i) -> loaded Image or nearest loaded one, ready }
   Phones get the square crop (m###.webp, 480px); wider screens the 16:9 set (d###.webp, 960px).
   Save-Data: only every 4th frame is fetched. Frames load in a coarse-to-fine order, so the
   clip scrubs early and sharpens as the rest arrive. */
window.Seq = (() => {
  const phone = matchMedia("(max-width: 720px)").matches;
  const saveData = navigator.connection && navigator.connection.saveData;
  function load(name, count, base, onFirst) {
    const imgs = new Array(count), pre = phone ? "m" : "d";
    const src = i => `${base}seq/${name}/${pre}${String(i).padStart(3, "0")}.webp`;
    const order = [];
    for (const step of [16, 8, 4, 2, 1]) for (let i = 0; i < count; i += step) if (!order.includes(i)) order.push(i);
    if (!order.includes(count - 1)) order.splice(1, 0, count - 1);
    const list = saveData ? order.filter(i => i % 4 === 0 || i === count - 1) : order;
    let next = 0, inflight = 0, started = false;
    const pump = () => {
      while (inflight < 6 && next < list.length) {
        const i = list[next++], im = new Image();
        inflight++;
        im.decoding = "async";
        im.onload = () => { imgs[i] = im; inflight--; if (i === 0 && onFirst) onFirst(); pump(); };
        im.onerror = () => { inflight--; pump(); };
        im.src = src(i);
      }
    };
    return {
      count,
      start() { if (!started) { started = true; pump(); } },
      frame(i) {
        i = Math.max(0, Math.min(count - 1, Math.round(i)));
        if (imgs[i]) return imgs[i];
        for (let d = 1; d < count; d++) { if (imgs[i - d]) return imgs[i - d]; if (imgs[i + d]) return imgs[i + d]; }
        return null;
      }
    };
  }
  // draw an image into a canvas the way CSS object-fit: cover (or contain) does
  // zoom < 1 shrinks the picture; contain fits the whole frame instead of filling
  function cover(ctx, img, w, h, alpha = 1, zoom = 1, contain = false) {
    if (!img) return;
    const s = (contain ? Math.min : Math.max)(w / img.naturalWidth, h / img.naturalHeight) * zoom;
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    ctx.imageSmoothingQuality = "high";
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    ctx.globalAlpha = 1;
  }
  function fit(canvas) {
    const d = Math.min(devicePixelRatio || 1, 2), w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * d) || canvas.height !== Math.round(h * d)) { canvas.width = Math.round(w * d); canvas.height = Math.round(h * d); }
    return [canvas.width, canvas.height];
  }
  return { load, cover, fit, phone };
})();
