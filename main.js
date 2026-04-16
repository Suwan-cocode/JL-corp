import { layout } from "./engine.js";
import { text } from "./content.js";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// ------------------------
const fontSize = 12;
const font = `${fontSize}px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`;
ctx.font = font;

const lineHeight = 24;
const columnWidth = 260;
const columnGap = 220;
const letterSpacing = 2.5;

// ------------------------
let mouse = { x: 0, y: 0, radius: 100 };
let trail = [];
let opacity = 1;
let isMouseInside = true;

// 팝업 물리
let popupOffset = 0;
let popupX = window.innerWidth;
let popupTargetX = window.innerWidth - 320;

// ------------------------
const gallery = document.getElementById("gallery");
const popup = document.getElementById("popup");

const images = [
  { src: "./images/img1.jpg", text: "model1" },
  { src: "./images/img2.jpg", text: "model2" },
  { src: "./images/img3.jpg", text: "model3" },
  { src: "./images/img4.jpg", text: "model4" },
  { src: "./images/img5.jpg", text: "model5" }
];

images.forEach((img, i) => {
  const el = document.createElement("img");
  el.src = img.src;
  el.onclick = () => openPopup(i);
  gallery.appendChild(el);
});

function openPopup(i) {
  popup.innerHTML = `
    <img src="${images[i].src}">
    <p>${images[i].text}</p>
  `;
  popup.classList.add("open");

  popupOffset = 300;
  popupX = canvas.width;
}

popup.onclick = () => {
  popup.classList.remove("open");
  popupOffset = 0;

  for (let line of [...col1, ...col2]) {
    for (let item of line) {
      item.active = false;
    }
  }
};

// ------------------------
function prepare(text, font) {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  ctx.font = font;

  return Array.from(text).map(ch => ({
    char: ch,
    width: ctx.measureText(ch).width,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    targetX: 0,
    targetY: 0,
    active: false,
    depth: Math.random()
  }));
}

const prepared = prepare(text, font);

// layout
const fullLayout = layout(prepared, () => columnWidth, lineHeight);
const half = Math.ceil(fullLayout.lines.length / 2);

const col1 = fullLayout.lines.slice(0, half);
const col2 = fullLayout.lines.slice(half);

document.body.style.height = (half * lineHeight + 200) + "px";

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
canvas.style.position = "fixed";

// ------------------------
// 힘
function pushForce(x, y) {
  const dx = x - mouse.x;
  const dy = y - mouse.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  let fx = 0;
  let fy = 0;

  if (dist < mouse.radius) {
    const force = (mouse.radius - dist) / mouse.radius;
    fx += dx * force * 2.5;
    fy += dy * force * 1.2;
  }

  fx -= popupOffset * 0.02;

  return { x: fx, y: fy };
}

// ------------------------
// 글자 충돌
function resolveCollisions(items) {
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];

      if (!a.active || !b.active) continue;
      if (Math.abs(a.depth - b.depth) > 0.3) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = (a.width + b.width) * 0.5;

      if (dist < minDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = (minDist - dist) * 0.5;

        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        const dvx = b.vx - a.vx;
        const dvy = b.vy - a.vy;
        const impact = dvx * nx + dvy * ny;
        if (impact > 0) continue;

        const restitution = 0.9;
        const impulse = (-(1 + restitution) * impact) / 2;

        a.vx -= impulse * nx;
        a.vy -= impulse * ny;
        b.vx += impulse * nx;
        b.vy += impulse * ny;
      }
    }
  }
}

// ------------------------
function drawColumn(lines, offsetX) {
  let itemsFlat = [];
  for (let line of lines) itemsFlat.push(...line);

  // 팝업 이동
  popupX += (popupTargetX - popupX) * 0.12;

  // 충돌 트리거 (팝업 근처 글자 활성화)
  for (let item of itemsFlat) {
    if (!item.active && item.x + item.width > popupX - popupOffset) {
      item.active = true;
      item.vx = -6 - Math.random() * 3;
      item.vy = (Math.random() - 0.5) * 5;
    }
  }

  // 물리
  for (let item of itemsFlat) {
    if (item.active) {
      item.x += item.vx;
      item.y += item.vy;

      item.vx *= 0.98;
      item.vy *= 0.98;

      item.vx += (Math.random() - 0.5) * 0.05;
      item.vy += (Math.random() - 0.5) * 0.05;

      if (item.x < 0 || item.x > canvas.width) item.vx *= -1;
      if (item.y < 0 || item.y > canvas.height) item.vy *= -1;

      // 팝업과 충돌
      if (item.x + item.width > popupX && item.x < popupX + popupOffset) {
        item.vx = -Math.abs(item.vx);
      }
    }
  }

  resolveCollisions(itemsFlat);

  // 기본 레이아웃
  let startY = 80 - window.scrollY;
  for (let row = 0; row < lines.length; row++) {
    const line = lines[row];
    let y = startY + row * lineHeight;
    let currentX = offsetX;

    for (let item of line) {
      if (!item.active) {
        if (item.x === 0 && item.y === 0) {
          item.x = currentX;
          item.y = y;
        }

        const force = pushForce(item.x, item.y);
        item.targetX = currentX + force.x;
        item.targetY = y + force.y;

        item.x += (item.targetX - item.x) * 0.18;
        item.y += (item.targetY - item.y) * 0.18;

        currentX += item.width + letterSpacing;
      }

      ctx.fillText(item.char, item.x, item.y);
    }
  }
}

// ------------------------
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const totalWidth = columnWidth * 2 + columnGap;
  const startX = (canvas.width - totalWidth) / 2;

  drawColumn(col1, startX);
  drawColumn(col2, startX + columnWidth + columnGap);

  // JL
  ctx.globalAlpha = opacity;
  ctx.font = `bold ${fontSize + 2}px Inter`;

  for (let i = 0; i < trail.length; i++) {
    const t = trail[i];
    ctx.globalAlpha = opacity * (i / trail.length);
    ctx.fillText("L", t.x, t.y);
  }

  if (isMouseInside) {
    ctx.globalAlpha = opacity;
    ctx.fillText("JL", mouse.x, mouse.y);
  }

document.body.style.cursor = "none"; //커서제거
  

   // 왼쪽 상단 JL corp. 로고 추가
  ctx.save(); // 현재 상태 저장
  ctx.globalAlpha = 1;
  ctx.font = `bold ${fontSize + 15}px Inter`; // 로고용 폰트
  ctx.fillStyle = "#000"; // 로고 색상
  ctx.fillText("JL corp.", 20, 40); // 좌측 상단 위치 조정
  ctx.restore(); // 상태 복원

  ctx.globalAlpha = 1;
  requestAnimationFrame(render);
}

// ------------------------
window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;

  trail.push({ x: mouse.x, y: mouse.y });
  if (trail.length > 10) trail.shift();

  isMouseInside = true;
});

document.addEventListener("mouseleave", () => { isMouseInside = false; });
document.addEventListener("mouseenter", () => { isMouseInside = true; });
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

render();
