(() => {
  const box = document.querySelector("[data-demo-player]");
  if (!box) return;
  const items = [
    { kicker: "LEVEL 1 / 7", image: "media/level-1-install.png?v=20261127", alt: "装吸头教学界面截图" },
    { kicker: "LEVEL 2 / 7", image: "media/level-2-volume.png?v=20261127", alt: "调体积教学界面截图" },
    { kicker: "LEVEL 3 / 7", image: "media/level-3-rinse.png?v=20261127", alt: "预润洗教学界面截图" },
    { kicker: "LEVEL 6 / 7", image: "media/level-6-eject.png?v=20261127", alt: "退吸头教学界面截图" },
    { kicker: "OVERVIEW", image: "media/overview.png?v=20261127", alt: "移液器教学七关总览截图" },
  ];
  items.forEach(it => { const i = new Image(); i.src = it.image; });
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const player = box.querySelector(".dm-player");
  const stage = box.querySelector("[data-demo-stage]");
  const buttons = [...box.querySelectorAll("[data-step]")];
  const image = box.querySelector("[data-stage-image]");
  const kicker = box.querySelector("[data-stage-kicker]");
  const count = box.querySelector("[data-stage-count]");
  let current = 0, timer = 0, visible = false, paused = false;

  const set = (index, user) => {
    current = (index + items.length) % items.length;
    const item = items[current];
    image.classList.add("is-swapping");
    setTimeout(() => { image.src = item.image; image.alt = item.alt; image.classList.remove("is-swapping"); }, reduce ? 0 : 180);
    kicker.textContent = item.kicker;
    count.textContent = `${String(current + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
    buttons.forEach((b, i) => {
      b.classList.remove("on");
      b.setAttribute("aria-pressed", String(i === current));
    });
    void buttons[current].offsetWidth; // restart the progress bar
    buttons[current].classList.add("on");
    if (user) stop();
    else schedule();
  };
  const schedule = () => {
    clearTimeout(timer);
    if (reduce || !visible || paused || !player.classList.contains("is-auto")) return;
    timer = setTimeout(() => set(current + 1), 6500);
  };
  const stop = () => { clearTimeout(timer); player.classList.remove("is-auto"); };

  buttons.forEach((b, i) => b.addEventListener("click", () => set(i, true)));
  box.querySelector("[data-prev]").addEventListener("click", () => set(current - 1, true));
  box.querySelector("[data-next]").addEventListener("click", () => set(current + 1, true));
  stage.addEventListener("keydown", e => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    set(current + (e.key === "ArrowRight" ? 1 : -1), true);
  });
  let x0 = 0;
  stage.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 60) set(current + (dx < 0 ? 1 : -1), true);
  }, { passive: true });
  player.addEventListener("pointerenter", () => { paused = true; clearTimeout(timer); });
  player.addEventListener("pointerleave", () => { paused = false; schedule(); });
  new IntersectionObserver(ents => { visible = ents[0].isIntersecting; visible ? schedule() : clearTimeout(timer); }, { threshold: 0.3 }).observe(player);
  if (reduce) player.classList.remove("is-auto");
})();

/* click the screenshot to view it full size */
(() => {
  const img = document.querySelector("[data-stage-image]");
  if (!img) return;
  const lb = document.createElement("div");
  lb.className = "dm-lb";
  lb.setAttribute("role", "dialog");
  lb.setAttribute("aria-modal", "true");
  lb.setAttribute("aria-label", "放大查看");
  lb.innerHTML = '<button type="button" class="dm-lb-x" aria-label="关闭">×</button><img alt="">';
  document.body.appendChild(lb);
  const big = lb.querySelector("img");
  const close = () => { lb.classList.remove("on"); document.body.style.overflow = ""; img.focus({ preventScroll: true }); };
  const open = () => {
    big.src = img.currentSrc || img.src;
    big.alt = img.alt;
    lb.classList.add("on");
    document.body.style.overflow = "hidden";
    lb.querySelector("button").focus();
  };
  img.tabIndex = 0;
  img.setAttribute("role", "button");
  img.setAttribute("aria-label", "放大查看截图");
  img.addEventListener("click", open);
  img.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  lb.addEventListener("click", (e) => { if (e.target !== big) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && lb.classList.contains("on")) close(); });
})();
