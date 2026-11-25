// LabMate AR glasses — procedural 3D model (illustrative, not a real device).
// Mounts on every [data-glasses3d] element. Plain ES module so it also runs
// in the static preview. Falls back to the inline SVG when WebGL is missing.
import * as THREE from "./vendor/three.module.min.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

function roundedRect(w, h, r, cx = 0, cy = 0, s = new THREE.Shape()) {
  const x = cx - w / 2, y = cy - h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
// lens outline: tighter top corners, generous bottom corners, a slight lift at the outer edge
function lensPath(w, h, cx, cy, path, side = 1) {
  const p = path || new THREE.Shape();
  const rt = 0.75, rb = Math.min(1.85, h / 2 - 0.05);
  const x0 = cx - w / 2, x1 = cx + w / 2, yT = cy + h / 2, yB = cy - h / 2;
  const lift = 0.18; // outer top corner sits a little higher
  const yT0 = side > 0 ? yT : yT + lift, yT1 = side > 0 ? yT + lift : yT;
  p.moveTo(x0 + rt, yT0);
  p.lineTo(x1 - rt, yT1);
  p.quadraticCurveTo(x1, yT1, x1, yT1 - rt);
  p.lineTo(x1, yB + rb);
  p.quadraticCurveTo(x1, yB, x1 - rb, yB);
  p.lineTo(x0 + rb, yB);
  p.quadraticCurveTo(x0, yB, x0, yB + rb);
  p.lineTo(x0, yT0 - rt);
  p.quadraticCurveTo(x0, yT0, x0 + rt, yT0);
  return p;
}

function hudTexture(lang) {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 768;
  const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const zh = lang !== "en";
  const T = (a, b) => (zh ? a : b);
  const font = (w, s) => `${w} ${s}px "Geist","PingFang SC","Noto Sans SC",sans-serif`;
  function panel(x, y, w, h, stroke) {
    g.beginPath(); g.roundRect(x, y, w, h, 18);
    g.lineWidth = 3; g.strokeStyle = stroke; g.shadowColor = stroke; g.shadowBlur = 18; g.stroke(); g.shadowBlur = 14;
  }
  function draw(phase, power) {
    g.clearRect(0, 0, c.width, c.height);
    g.globalAlpha = power; g.shadowColor = "#7fdbff"; g.shadowBlur = 14;
    const ok = phase === 1;
    const col = ok ? "#3ddc97" : "#ff6b5e";
    // header
    panel(40, 40, 944, 140, "rgba(127,219,255,0.8)");
    g.fillStyle = "#7fdbff"; g.font = font(800, 54); g.fillText("1/9", 84, 132);
    g.fillStyle = "#f2fbff"; g.font = font(800, 66); g.fillText(T("加水 · 20 µL", "Water · 20 µL"), 210, 136);
    // progress
    for (let i = 0; i < 5; i++) {
      g.beginPath(); g.roundRect(40 + i * 192, 210, 176, 16, 8);
      g.fillStyle = i === 0 ? "#7fdbff" : "rgba(127,219,255,0.18)"; g.fill();
    }
    // reading
    panel(40, 262, 600, 250, col);
    g.fillStyle = "#b4c6d4"; g.font = font(600, 40); g.fillText(T("移液器读数", "Pipette reading"), 84, 332);
    g.fillStyle = col; g.font = font(800, 120); g.fillText(ok ? "20.0" : "201.6", 80, 468);
    g.font = font(700, 54); g.fillText("µL", ok ? 360 : 440, 468);
    // bracket
    g.strokeStyle = col; g.lineWidth = 8; g.lineCap = "round";
    const bx = 704, by = 262, bw = 280, bh = 250, k = 50;
    g.beginPath();
    g.moveTo(bx, by + k); g.lineTo(bx, by); g.lineTo(bx + k, by);
    g.moveTo(bx + bw - k, by); g.lineTo(bx + bw, by); g.lineTo(bx + bw, by + k);
    g.moveTo(bx + bw, by + bh - k); g.lineTo(bx + bw, by + bh); g.lineTo(bx + bw - k, by + bh);
    g.moveTo(bx + k, by + bh); g.lineTo(bx, by + bh); g.lineTo(bx, by + bh - k);
    g.stroke();
    g.fillStyle = col; g.font = font(800, 72); g.textAlign = "center";
    g.fillText(ok ? "✓" : "!", bx + bw / 2, by + bh / 2 + 26); g.textAlign = "left";
    // prompt
    panel(40, 550, 944, 170, ok ? "rgba(61,220,151,0.85)" : "rgba(255,107,94,0.85)");
    g.fillStyle = ok ? "#3ddc97" : "#ffd6d1"; g.font = font(800, 56);
    g.fillText(ok ? T("读数正确", "Reading correct") : T("超出量程", "Out of range"), 84, 626);
    g.fillStyle = "#e6f2fa"; g.font = font(600, 44);
    g.fillText(ok ? T("下一步：装枪头", "Next: attach a tip") : T("朝减小方向调整旋钮", "Turn the dial down"), 84, 690);
    g.globalAlpha = 1;
    tex.needsUpdate = true;
  }
  return { tex, draw };
}

function mount(host) {
  const variant = host.dataset.glasses3d || "hero";
  const lang = document.documentElement.lang.startsWith("en") ? "en" : "zh";
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const canvas = renderer.domElement;
  canvas.className = "g3d-canvas";
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(variant === "hero" ? 24 : 26, 1, 0.1, 500);
  camera.position.set(0, 0.6, variant === "hero" ? 23 : 31);
  camera.lookAt(0, 0, 0);

  // ---------- materials
  const acetate = new THREE.MeshPhysicalMaterial({
    color: 0x0c0e11, roughness: 0.3, metalness: 0.05,
    clearcoat: 1, clearcoatRoughness: 0.04, sheen: 0.35, sheenColor: 0x2f4f63, envMapIntensity: 1.25,
  });
  const satin = new THREE.MeshPhysicalMaterial({ color: 0x23282f, roughness: 0.55, metalness: 0.2, clearcoat: 0.4 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xc4ccd6, roughness: 0.22, metalness: 1 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x2a3a46, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.38,
    clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.2, depthWrite: false,
  });
  const camGlass = new THREE.MeshPhysicalMaterial({ color: 0x050709, roughness: 0.05, metalness: 0.3, clearcoat: 1 });

  const glasses = new THREE.Group();
  scene.add(glasses);
  const front = new THREE.Group();
  glasses.add(front);

  const bevel = { bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.07, bevelSegments: 8, curveSegments: 64 };
  const LW = 5.3, LH = 3.45, LX = 3.3, LY = 0.05;
  // rims (outer shape with lens hole)
  [-1, 1].forEach((side) => {
    const outer = lensPath(LW + 0.38, LH + 0.4, side * LX, LY + 0.02, null, side);
    outer.holes.push(lensPath(LW, LH, side * LX, LY, new THREE.Path(), side));
    const geo = new THREE.ExtrudeGeometry(outer, { depth: 0.42, ...bevel });
    const rim = new THREE.Mesh(geo, acetate);
    rim.position.z = -0.25;
    front.add(rim);
    // lens: thin extrusion, slightly bowed by scaling
    const lgeo = new THREE.ExtrudeGeometry(lensPath(LW + 0.1, LH + 0.1, side * LX, LY, null, side), {
      depth: 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 48,
    });
    const lens = new THREE.Mesh(lgeo, glass);
    lens.position.z = -0.02;
    front.add(lens);
  });
  // brow bar that hides the electronics
  const brow = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRect(13.1, 0.5, 0.24, 0, 1.92), { depth: 0.6, ...bevel }),
    acetate,
  );
  brow.position.z = -0.32;
  front.add(brow);
  // bridge
  const bridgeShape = new THREE.Shape();
  bridgeShape.moveTo(-0.6, 1.6); bridgeShape.lineTo(0.6, 1.6);
  bridgeShape.quadraticCurveTo(0.62, 1.05, 0.4, 1.0); bridgeShape.quadraticCurveTo(0, 1.25, -0.4, 1.0);
  bridgeShape.quadraticCurveTo(-0.62, 1.05, -0.6, 1.6);
  const bridge = new THREE.Mesh(new THREE.ExtrudeGeometry(bridgeShape, { depth: 0.46, ...bevel }), acetate);
  bridge.position.z = -0.23;
  front.add(bridge);
  // end pieces / hinge housings
  [-1, 1].forEach((s) => {
    const end = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRect(0.9, 1.5, 0.35, 0, 0), { depth: 1.1, ...bevel }), acetate);
    end.position.set(s * 6.45, 1.55, -1.05);
    front.add(end);
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.9, 24), metal);
    hinge.position.set(s * 6.5, 1.55, -1.35);
    front.add(hinge);
  });
  // camera module on the right end piece
  const camRing = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 16, 48), metal);
  camRing.position.set(5.6, 1.92, 0.42);
  front.add(camRing);
  const camLens = new THREE.Mesh(new THREE.CircleGeometry(0.13, 48), camGlass);
  camLens.position.set(5.6, 1.92, 0.41);
  front.add(camLens);
  const glint = new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), new THREE.MeshBasicMaterial({ color: 0x8ad8ff, toneMapped: false }));
  glint.position.set(5.64, 1.96, 0.43);
  front.add(glint);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: 0x3ddc97, toneMapped: false }));
  led.position.set(-5.6, 1.92, 0.42);
  front.add(led);

  // temples
  [-1, 1].forEach((s) => {
    const prof = new THREE.Shape();
    prof.moveTo(0, 0.55); prof.lineTo(9.2, 0.32); prof.quadraticCurveTo(10.6, 0.25, 11.4, -0.9);
    prof.lineTo(11.15, -1.05); prof.quadraticCurveTo(10.4, -0.1, 9.2, -0.05); prof.lineTo(0, -0.55); prof.closePath();
    const geo = new THREE.ExtrudeGeometry(prof, { depth: 0.36, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 4, curveSegments: 32 });
    const temple = new THREE.Mesh(geo, satin);
    temple.rotation.y = s > 0 ? Math.PI / 2 + 0.06 : Math.PI / 2 - 0.06;
    temple.position.set(s * 6.5 - 0.18, 1.55, -1.3);
    front.add(temple);
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 7.5), metal);
    line.position.set(s * 6.5 + s * 0.16, 1.55, -4.9);
    front.add(line);
    const tip = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRect(2.6, 0.7, 0.3), { depth: 0.44, ...bevel }), acetate);
    tip.rotation.y = Math.PI / 2;
    tip.position.set(s * 6.5 - 0.22, 1.55, -3.3);
    front.add(tip);
  });

  // HUD (projected inside the right lens, the left lens shows the step bar)
  let hud, hudMat;
  if (variant === "hero") {
    hud = hudTexture(lang);
    hud.draw(0, 0);
    const mat = new THREE.MeshBasicMaterial({ map: hud.tex, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
    hudMat = mat;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.55), mat);
    plane.position.set(LX + 0.55, LY + 0.25, 0.16);
    front.add(plane);
  }

  // lights: a cool rim from behind, a warm key, soft fill
  const rim = new THREE.SpotLight(0x7fd8ff, 260, 60, 0.6, 0.6); rim.position.set(-6, 8, -14); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0x7fd8ff, 1.4); rim2.position.set(9, 3, -8); scene.add(rim2);
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-5, 12, 10); scene.add(key);
  scene.add(new THREE.HemisphereLight(0xbfdcff, 0x0a0d12, 0.35));

  // contact shadow
  const sc = document.createElement("canvas"); sc.width = sc.height = 128;
  const sg = sc.getContext("2d");
  const grd = sg.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, "rgba(0,0,0,0.4)"); grd.addColorStop(1, "rgba(0,0,0,0)");
  sg.fillStyle = grd; sg.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -2.4;
  scene.add(shadow);

  // ---------- sizing, pointer, visibility
  let vw = 1, vh = 1;
  function resize() {
    const w = host.clientWidth, h = host.clientHeight || w * 0.5;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (variant === "hero") {
      camera.position.z = 30 * Math.max(1, Math.pow(1.6 / camera.aspect, 0.95));
    } else {
      camera.position.z = 31 * Math.max(1, Math.pow(2.4 / camera.aspect, 0.85));
    }
    vw = w; vh = h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();
  let px = 0, py = 0, tx = 0, ty = 0;
  if (!reduce) {
    addEventListener("pointermove", (e) => {
      tx = (e.clientX / innerWidth - 0.5) * 2;
      ty = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
  }
  let visible = true;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) loop(); }).observe(host);

  const track = host.closest("[data-hero-track]");
  const t0 = performance.now();
  let raf = 0;
  const ease = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
  let lastPhase = -1, lastPower = -1;
  function frame(now) {
    const t = reduce ? 9 : (now - t0) / 1000;
    const intro = ease(t / 2.2);
    px += (tx - px) * 0.05; py += (ty - py) * 0.05;
    const yaw = variant === "hero" ? -0.62 + 0.14 * Math.sin(t * 0.32) : -0.6 + 0.3 * Math.sin(t * 0.25);
    let sp = 0;
    if (variant === "hero" && track) {
      const r = track.getBoundingClientRect();
      sp = Math.min(Math.max(-r.top / Math.max(1, r.height - innerHeight), 0), 1);
      track.style.setProperty("--p", sp.toFixed(3));
    }
    const d = ease(Math.min(sp / 0.75, 1));
    glasses.rotation.y = (yaw * intro + (1 - intro) * -1.2 + px * 0.18) * (1 - d);
    glasses.rotation.x = glasses.rotation.x * (1 - d);
    glasses.position.x = (vw < 700 ? -1.6 : 0) * (1 - d) - LX * d;
    glasses.position.y = glasses.position.y * (1 - d) - LY * d;
    glasses.position.z = (camera.position.z - 9) * d;
    if (variant === "hero") camera.setViewOffset(vw, vh, 0, vh * (vw < 700 ? 0.14 : 0.125) * (1 - d), vw, vh);
    canvas.style.opacity = String(1 - Math.min(Math.max((sp - 0.46) / 0.1, 0), 1));
    glasses.rotation.x = 0.16 + py * 0.06 + (1 - intro) * 0.3;
    glasses.position.y = Math.sin(t * 0.9) * 0.18 - (1 - intro) * 1.2;
    shadow.material.opacity = 0.7 - Math.sin(t * 0.9) * 0.12;
    led.material.color.setHex(Math.sin(t * 3) > 0.2 ? 0x3ddc97 : 0x0f3a29);
    if (hudMat) hudMat.opacity = 1 - Math.min(Math.max((sp - 0.28) / 0.12, 0), 1);
    if (hud) {
      const on = ease((t - 1.6) / 0.8);
      const flicker = t < 2.6 && !reduce ? (Math.sin(t * 60) > 0 ? 1 : 0.6) : 1;
      const power = on * flicker;
      const phase = reduce || sp > 0.2 ? 0 : Math.floor((t - 1.6) / 3.2) % 2 === 1 ? 1 : 0;
      if (phase !== lastPhase || Math.abs(power - lastPower) > 0.02) {
        hud.draw(phase, power); lastPhase = phase; lastPower = power;
      }
    }
    renderer.render(scene, camera);
  }
  function loop() {
    cancelAnimationFrame(raf);
    const step = (now) => {
      frame(now);
      if (visible && !reduce) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  loop();
  host.classList.add("is-3d");
}

function init() {
  document.querySelectorAll("[data-glasses3d]").forEach((el) => {
    if (el.dataset.mounted) return;
    if (el.closest("[hidden]")) return;
    el.dataset.mounted = "1";
    mount(el);
  });
}
init();
// the preview switches views by toggling [hidden]; mount when one becomes visible
addEventListener("hashchange", () => setTimeout(init, 50));
new MutationObserver(() => init()).observe(document.body, { subtree: true, childList: true });
