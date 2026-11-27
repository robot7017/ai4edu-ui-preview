/* Shared mobile navigation for News and Demo. */
(() => {
  const header = document.querySelector(".subpage .site-header");
  const toggle = header?.querySelector(".site-menu");
  if (!toggle) return;
  const close = () => {
    header.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "打开菜单");
  };
  toggle.addEventListener("click", () => {
    const open = header.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
  });
  header.querySelectorAll("nav a").forEach(link => link.addEventListener("click", close));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && header.classList.contains("is-open")) { close(); toggle.focus(); }
  });
  document.addEventListener("click", event => { if (!header.contains(event.target)) close(); });
  matchMedia("(min-width: 901px)").addEventListener("change", close);
})();

/* Subpage visual layer: camera HUD on .cam frames, live clocks, reveal + count-up on scroll. */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mk = (tag, cls, parent) => { const n = document.createElement(tag); if (cls) n.className = cls; parent.appendChild(n); return n; };
  const clocks = [];
  document.querySelectorAll(".subpage .cam").forEach(cam => {
    const hud = mk("div", "cam-hud", cam);
    hud.setAttribute("aria-hidden", "true");
    ["tl", "tr", "bl", "br"].forEach(c => mk("i", "cam-c " + c, hud));
    mk("i", "cam-scan", hud);
    const top = mk("div", "cam-top", hud);
    mk("b", "", top).textContent = cam.dataset.camRec || "LIVE";
    if (cam.dataset.cam) mk("span", "", top).textContent = cam.dataset.cam;
    clocks.push(mk("span", "cam-clock", top));
    const ticks = mk("div", "cam-ticks", hud);
    for (let i = 0; i < 21; i++) mk("i", "", ticks);
  });
  const pad = n => String(n).padStart(2, "0");
  const tick = () => {
    const d = new Date();
    const t = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}:${pad(Math.floor(d.getMilliseconds() / 40))}`;
    clocks.forEach(c => (c.textContent = t));
    if (!reduce) requestAnimationFrame(tick);
  };
  if (clocks.length) tick();

  const countUp = el => {
    const to = parseFloat(el.dataset.count);
    if (reduce || isNaN(to)) { el.textContent = el.dataset.count; return; }
    let t0 = 0;
    const step = t => {
      if (!t0) t0 = t;
      const k = Math.min(1, (t - t0) / 1300);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = "0";
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(ents => ents.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("is-in");
    e.target.querySelectorAll("[data-count]").forEach(countUp);
    io.unobserve(e.target);
  }), { threshold: 0.15 });
  document.querySelectorAll(".subpage [data-reveal], .subpage [data-counts]").forEach(n => io.observe(n));

  /* videos: poster + one big play button; native controls appear once playing */
  document.querySelectorAll(".subpage .cam > video").forEach(v => {
    const cam = v.parentElement;
    const btn = mk("button", "cam-play", cam);
    btn.type = "button";
    btn.setAttribute("aria-label", v.getAttribute("aria-label") || "播放录屏");
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
    v.removeAttribute("controls");
    btn.addEventListener("click", () => {
      cam.classList.add("is-playing");
      v.setAttribute("controls", "");
      v.play();
    });
    v.addEventListener("ended", () => { cam.classList.remove("is-playing"); v.removeAttribute("controls"); v.load(); });
  });
})();
