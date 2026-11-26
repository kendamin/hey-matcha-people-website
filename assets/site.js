/* Hey Matcha People: shared by Option A (/) and Option B (/v2/).
   Message chooser: every m.me / ig.me link opens a native <dialog> with the app link, the web
   links and email. Facebook/Instagram's in-app browser often won't hand m.me links to the
   Messenger app, so the tip only shows there. Without JavaScript the plain links still work. */
(() => {
  const d = document.getElementById("msgDialog");
  if (!d) return;
  const ua = navigator.userAgent;
  const isPhone = /Android|iPhone|iPad|iPod/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  const inApp = /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram/i.test(ua);
  if (isPhone) d.querySelector("#msgApp").hidden = false;
  if (inApp) d.querySelector("#msgNote").hidden = false;

  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="https://m.me/"], a[href^="https://ig.me/"], [data-msg]');
    if (!a || d.contains(a)) return;
    e.preventDefault();
    d.showModal();
    d.querySelector(".btn:not([hidden])")?.focus();
  });

  // Safari without closedby: tap outside to close
  if (!("closedBy" in HTMLDialogElement.prototype)) {
    let downOutside = false;
    const outside = e => { const r = d.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; };
    d.addEventListener("pointerdown", e => { downOutside = outside(e); });
    d.addEventListener("pointerup", e => { if (downOutside && outside(e)) d.close(); });
  }
})();
