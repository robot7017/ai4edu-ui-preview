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
