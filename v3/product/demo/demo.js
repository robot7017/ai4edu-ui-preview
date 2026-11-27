(() => {
  const box = document.querySelector("[data-demo-player]");
  if (!box) return;
  const items = [
    { kicker: "LEVEL 1 / 7", title: "装吸头", caption: "把移液器装上密封的吸头。", detail: "对准、压入、确认密合；系统给出下一步提示。", image: "media/level-1-install.png", alt: "装吸头训练界面截图" },
    { kicker: "LEVEL 2 / 7", title: "调体积", caption: "把体积设定到 150.0 µL。", detail: "通过旋钮操作和量程窗口，持续看到当前值与目标值。", image: "media/level-2-volume.png", alt: "调体积训练界面截图" },
    { kicker: "LEVEL 3 / 7", title: "预润洗", caption: "预润洗 1 次：吸一次，再打回原管。", detail: "动作、深度和复位状态同时被呈现出来。", image: "media/level-3-rinse.png", alt: "预润洗训练界面截图" },
    { kicker: "LEVEL 6 / 7", title: "退吸头", caption: "把空吸头退进废液桶。", detail: "对准桶口、按下退吸头，完成这一关。", image: "media/level-6-eject.png", alt: "退吸头训练界面截图" },
    { kicker: "OVERVIEW", title: "完整路径", caption: "从装吸头到收尾，七个关卡串起来。", detail: "查看各关卡的训练目标与完成状态。", image: "media/overview.png", alt: "移液器训练七关总览截图" },
  ];
  const buttons = [...box.querySelectorAll("[data-step]")];
  const image = box.querySelector("[data-stage-image]");
  const kicker = box.querySelector("[data-stage-kicker]");
  const title = box.querySelector("[data-stage-title]");
  const caption = box.querySelector("[data-stage-caption]");
  const detail = box.querySelector("[data-stage-detail]");
  const count = box.querySelector("[data-stage-count]");
  const dots = [...box.querySelectorAll(".stage-dots i")];
  let current = 0;
  let touchStart = 0;
  let lastSwipe = 0;
  const set = (index) => {
    current = (index + items.length) % items.length;
    const item = items[current];
    image.src = item.image;
    image.alt = item.alt;
    kicker.textContent = item.kicker;
    title.textContent = item.title;
    caption.textContent = item.caption;
    detail.textContent = item.detail;
    count.textContent = `${String(current + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
    buttons.forEach((button, i) => {
      button.classList.toggle("is-active", i === current);
      button.setAttribute("aria-pressed", String(i === current));
    });
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === current));
  };
  buttons.forEach((button, i) => button.addEventListener("click", () => set(i)));
  box.querySelector("[data-prev]").addEventListener("click", () => set(current - 1));
  box.querySelector("[data-next]").addEventListener("click", () => set(current + 1));
  box.querySelector("[data-demo-stage]").addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    set(current + (event.key === "ArrowRight" ? 1 : -1));
  });
  const stage = box.querySelector("[data-demo-stage]");
  stage.addEventListener("touchstart", (event) => { touchStart = event.touches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", (event) => {
    const dx = event.changedTouches[0].clientX - touchStart;
    const now = Date.now();
    if (Math.abs(dx) < 96 || now - lastSwipe < 650) return;
    lastSwipe = now;
    set(current + (dx < 0 ? 1 : -1));
  }, { passive: true });
  set(0);
})();
