let balance = 1000;
let isSpinning = false;
let bonusTimer = null;

const tape = document.getElementById('tape');
const openBtn = document.getElementById('open-btn');
const bonusBtn = document.getElementById('bonus-btn');

// Рисуем пушки на холсте
function makeSkinImage(type, c1, c2) {
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 90;
  const g = c.getContext('2d');

  const grad = g.createLinearGradient(10, 10, 150, 80);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  g.fillStyle = grad;
  g.strokeStyle = '#ffffff';
  g.lineWidth = 2;

  g.beginPath();
  if (type === 'pistol') {
    g.moveTo(35, 25); g.lineTo(120, 25); g.lineTo(120, 42);
    g.lineTo(75, 42); g.lineTo(65, 72); g.lineTo(45, 72);
    g.lineTo(55, 42); g.lineTo(35, 42);
  } else if (type === 'smg') {
    g.moveTo(20, 30); g.lineTo(135, 30); g.lineTo(135, 45);
    g.lineTo(95, 45); g.lineTo(90, 75); g.lineTo(76, 75);
    g.lineTo(80, 45); g.lineTo(50, 45); g.lineTo(42, 70);
    g.lineTo(28, 70); g.lineTo(35, 45); g.lineTo(20, 45);
  } else if (type === 'rifle') {
    g.moveTo(10, 38); g.lineTo(40, 30); g.lineTo(125, 30);
    g.lineTo(150, 34); g.lineTo(150, 40); g.lineTo(115, 42);
    g.lineTo(95, 42); g.lineTo(105, 72); g.lineTo(90, 72);
    g.lineTo(80, 44); g.lineTo(55, 44); g.lineTo(46, 68);
    g.lineTo(32, 68); g.lineTo(38, 44); g.lineTo(10, 48);
  } else if (type === 'awp') {
    g.moveTo(8, 38); g.lineTo(120, 38); g.lineTo(155, 40);
    g.lineTo(155, 45); g.lineTo(120, 47); g.lineTo(82, 47);
    g.lineTo(76, 70); g.lineTo(63, 70); g.lineTo(68, 47);
    g.lineTo(42, 47); g.lineTo(32, 68); g.lineTo(18, 68);
    g.lineTo(25, 47); g.lineTo(8, 52);
    g.rect(52, 22, 46, 9);
  } else if (type === 'knife') {
    g.moveTo(20, 55); g.quadraticCurveTo(60, 42, 85, 45);
    g.lineTo(145, 25); g.quadraticCurveTo(135, 52, 85, 56);
    g.lineTo(25, 68);
  }
  g.closePath();
  g.fill();
  g.stroke();
  return c.toDataURL();
}

// Звуки
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioCtx();

function playTick() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(520, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(140, audioCtx.currentTime + 0.04);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.045);
}

function playWin(isRare) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const notes = isRare ? new Array(523, 659, 784, 1046) : new Array(440, 554, 659);
  notes.forEach((freq, idx) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.1);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime + idx * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.1 + 0.35);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + idx * 0.1);
    osc.stop(audioCtx.currentTime + idx * 0.1 + 0.36);
  });
}

const skins = new Array(
  { name: 'P250 | Песчаная буря', img: makeSkinImage('pistol', '#d6c096', '#8c734b'), rarity: 'blue', price: 40, chance: 45 },
  { name: 'MP9 | Утечка', img: makeSkinImage('smg', '#3b82f6', '#1e3a8a'), rarity: 'blue', price: 60, chance: 30 },
  { name: 'AK-47 | Снежный вихрь', img: makeSkinImage('rifle', '#38bdf8', '#a855f7'), rarity: 'purple', price: 220, chance: 15 },
  { name: 'M4A4 | Темукау', img: makeSkinImage('rifle', '#ec4899', '#f472b6'), rarity: 'pink', price: 650, chance: 6 },
  { name: 'AWP | Азимов', img: makeSkinImage('awp', '#f97316', '#ffffff'), rarity: 'red', price: 1800, chance: 3 },
  { name: '★ Нож-бабочка | Градиент', img: makeSkinImage('knife', '#eab308', '#ec4899'), rarity: 'gold', price: 9500, chance: 1 }
);

function getRandomSkin() {
  const rand = Math.random() * 100;
  let sum = 0;
  for (const s of skins) {
    sum += s.chance;
    if (rand <= sum) return s;
  }
  return skins.at(0);
}

openBtn.addEventListener('click', () => {
  if (isSpinning) return;
  if (balance < 250) {
    alert('Не хватает монет! Продай скины или подожди бонус.');
    return;
  }

  balance -= 250;
  document.getElementById('bal').innerText = balance;
  isSpinning = true;
  openBtn.disabled = true;

  tape.style.transition = 'none';
  tape.style.transform = 'translateX(0px)';
  tape.innerHTML = '';

  let wonSkin = skins.at(0);
  for (let i = 0; i < 40; i++) {
    const s = getRandomSkin();
    if (i === 35) wonSkin = s;
    tape.innerHTML += `<div class="item ${s.rarity}"><img src="${s.img}"><div>${s.name}</div></div>`;
  }

  let lastTick = -1;
  const tickTimer = setInterval(() => {
    const m = new WebKitCSSMatrix(window.getComputedStyle(tape).transform);
    const idx = Math.floor((Math.abs(m.m41) + 340) / 145);
    if (idx !== lastTick) {
      lastTick = idx;
      playTick();
    }
  }, 30);

  setTimeout(() => {
    tape.style.transition = 'transform 3.8s cubic-bezier(0.08, 0.85, 0.15, 1)';
    const offset = (35 * 145) - 270 + (Math.random() * 60 - 30);
    tape.style.transform = `translateX(-${offset}px)`;
  }, 50);

  setTimeout(() => {
    clearInterval(tickTimer);
    isSpinning = false;
    openBtn.disabled = false;
    playWin(wonSkin.rarity === 'gold' || wonSkin.rarity === 'red');
    addToInv(wonSkin);
  }, 3900);
});

function addToInv(skin) {
  const inv = document.getElementById('inv');
  const card = document.createElement('div');
  card.className = `inv-item ${skin.rarity}`;
  card.innerHTML = `<img src="${skin.img}"><br><b>${skin.name}</b><br><span style="color:#4ade80;">Продать: ${skin.price} ₽</span>`;
  card.addEventListener('click', () => {
    playWin(false);
    balance += skin.price;
    document.getElementById('bal').innerText = balance;
    card.remove();
  });
  inv.prepend(card);
}

bonusBtn.addEventListener('click', () => {
  if (bonusBtn.disabled) return;
  balance += 500;
  document.getElementById('bal').innerText = balance;

  let sec = 30;
  bonusBtn.disabled = true;
  bonusBtn.innerText = `Бонус через ${sec}с`;

  bonusTimer = setInterval(() => {
    sec--;
    if (sec <= 0) {
      clearInterval(bonusTimer);
      bonusBtn.disabled = false;
      bonusBtn.innerText = '+ 500 ₽ (Бонус)';
    } else {
      bonusBtn.innerText = `Бонус через ${sec}с`;
    }
  }, 1000);
});
