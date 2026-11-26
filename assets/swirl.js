/* Matcha swirl background video (Ken's Flow clip, made into a seamless slow loop).
   <video class="swirl-bg" data-d="...swirl-d.mp4" data-m="...swirl-m.mp4" poster="..."> inside a section.
   Loads only when the section is near the screen, plays only while visible.
   Reduced motion or Save-Data: the still poster stays, no video is downloaded. */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const save = navigator.connection && navigator.connection.saveData;
  if (reduce || save) return;
  const phone = matchMedia("(max-width: 720px)").matches;
  document.querySelectorAll("video.swirl-bg").forEach(v => {
    v.muted = true;
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!v.src) v.src = phone ? v.dataset.m : v.dataset.d;
        v.play().catch(() => {});
      } else if (!v.paused) v.pause();
    }, { rootMargin: "200px" }).observe(v.parentElement);
  });
})();
