// Загружаем сохранённый баланс и инвентарь
let balance = Number(localStorage.getItem('flox_bal'));
if (!localStorage.getItem('flox_bal')) balance = 1000;

let myInventory = new Array();
try {
  const savedInv = JSON.parse(localStorage.getItem('flox_inv'));
  if (savedInv) myInventory = savedInv;
} catch {}

let isSpinning = false;
let bonusTimer = null;
let selectedCase = 'mid';

const tape = document.getElementById('tape');
const openBtn = document.getElementById('open-btn');
const bonusBtn = document.getElementById('bonus-btn');
const contractBtn = document.getElementById('contract-btn');

// Генератор скинов на холсте
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
  } else if (type === 'karambit') {
    g.moveTo(25, 45); g.quadraticCurveTo(65, 20, 130, 35);
    g.quadraticCurveTo(95, 55, 55, 55); g.arc(25, 55, 12, 0, Math.PI * 2);
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

// База из 3 кейсов
const casesData = {
  cheap: {
    name: 'Кейс «Новичок»',
    price: 100,
    skins: new Array(
      { name: 'Glock-18 | Жернов', type: 'pistol', c1: '#64748b', c2: '#334155', rarity: 'blue', price: 25, chance: 55 },
      { name: 'MAC-10 | Карамель', type: 'smg', c1: '#f59e0b', c2: '#b45309', rarity: 'blue', price: 40, chance: 30 },
      { name: 'FAMAS | Механо-пушка', type: 'rifle', c1: '#e2e8f0', c2: '#ef4444', rarity: 'purple', price: 140, chance: 11 },
      { name: 'AWP | Горячечные грёзы', type: 'awp', c1: '#ec4899', c2: '#3b82f6', rarity: 'pink', price: 420, chance: 3 },
      { name: '★ Тычковые ножи', type: 'knife', c1: '#eab308', c2: '#f97316', rarity: 'gold', price: 2500, chance: 1 }
    )
  },
  mid: {
    name: 'Кейс «Революция»',
    price: 250,
    skins: new Array(
      { name: 'P250 | Песчаная буря', type: 'pistol', c1: '#d6c096', c2: '#8c734b', rarity: 'blue', price: 40, chance: 45 },
      { name: 'MP9 | Утечка', type: 'smg', c1: '#3b82f6', c2: '#1e3a8a', rarity: 'blue', price: 60, chance: 30 },
      { name: 'AK-47 | Снежный вихрь', type: 'rifle', c1: '#38bdf8', c2: '#a855f7', rarity: 'purple', price: 220, chance: 15 },
      { name: 'M4A4 | Темукау', type: 'rifle', c1: '#ec4899', c2: '#f472b6', rarity: 'pink', price: 650, chance: 6 },
      { name: 'AWP | Азимов', type: 'awp', c1: '#f97316', c2: '#ffffff', rarity: 'red', price: 1800, chance: 3 },
      { name: '★ Нож-бабочка | Градиент', type: 'knife', c1: '#eab308', c2: '#ec4899', rarity: 'gold', price: 9500, chance: 1 }
    )
  },
  vip: {
    name: 'Кейс «Элитный»',
    price: 1000,
    skins: new Array(
      { name: 'Desert Eagle | Пламя', type: 'pistol', c1: '#f97316', c2: '#dc2626', rarity: 'purple', price: 550, chance: 45 },
      { name: 'AK-47 | Вулкан', type: 'rifle', c1: '#0284c7', c2: '#f8fafc', rarity: 'pink', price: 1200, chance: 30 },
      { name: 'M4A1-S | Поток информации', type: 'rifle', c1: '#f8fafc', c2: '#a855f7', rarity: 'red', price: 2800, chance: 15 },
      { name: '★ Керамбит | Волны', type: 'karambit', c1: '#eab308', c2: '#06b6d4', rarity: 'gold', price: 18500, chance: 10 }
    )
  }
};

// Переключение вкладок кейсов
function selectCase(key) {
  if (isSpinning) return;
  selectedCase = key;
  document.querySelectorAll('.case-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + key).classList.add('active');
  const c = casesData[key];
  document.getElementById('current-case-name').innerText = c.name;
  openBtn.innerText = `Открыть кейс (${c.price} ₽)`;
}

document.getElementById('tab-cheap').addEventListener('click', () => selectCase('cheap'));
document.getElementById('tab-mid').addEventListener('click', () => selectCase('mid'));
document.getElementById('tab-vip').addEventListener('click', () => selectCase('vip'));

// Сохранение и отрисовка инвентаря
function saveProgress() {
  localStorage.setItem('flox_bal', balance);
  localStorage.setItem('flox_inv', JSON.stringify(myInventory));
  document.getElementById('bal').innerText = balance;
}

function renderInventory() {
  const inv = document.getElementById('inv');
  inv.innerHTML = '';

  let blueCount = 0;
  myInventory.forEach((skin, index) => {
    if (skin.rarity === 'blue') blueCount++;
    const card = document.createElement('div');
    card.className = `inv-item ${skin.rarity}`;
    const imgUrl = makeSkinImage(skin.type, skin.c1, skin.c2);
    card.innerHTML = `<img src="${imgUrl}"><br><b>${skin.name}</b><br><span style="color:#4ade80;">Продать: ${skin.price} ₽</span>`;
    card.addEventListener('click', () => {
      playWin(false);
      balance += skin.price;
      myInventory.splice(index, 1);
      saveProgress();
      renderInventory();
    });
    inv.appendChild(card);
  });

  contractBtn.innerText = `⚗️ Контракт (${blueCount}/5 синих)`;
}

function getRandomSkin() {
  const list = casesData[selectedCase].skins;
  const rand = Math.random() * 100;
  let sum = 0;
  for (const s of list) {
    sum += s.chance;
    if (rand <= sum) return s;
  }
  return list.at(0);
}

// Открытие кейса
openBtn.addEventListener('click', () => {
  if (isSpinning) return;
  const currentCase = casesData[selectedCase];
  if (balance < currentCase.price) {
    alert('Не хватает монет! Продай скины или подожди бонус.');
    return;
  }

  balance -= currentCase.price;
  saveProgress();
  isSpinning = true;
  openBtn.disabled = true;

  tape.style.transition = 'none';
  tape.style.transform = 'translateX(0px)';
  tape.innerHTML = '';

  let wonSkin = currentCase.skins.at(0);
  for (let i = 0; i < 40; i++) {
    const s = getRandomSkin();
    if (i === 35) wonSkin = s;
    const imgUrl = makeSkinImage(s.type, s.c1, s.c2);
    tape.innerHTML += `<div class="item ${s.rarity}"><img src="${imgUrl}"><div>${s.name}</div></div>`;
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
    myInventory.unshift(wonSkin);
    saveProgress();
    renderInventory();
  }, 3900);
});

// Контракт обмена: 5 синих -> 1 фиолетовый
contractBtn.addEventListener('click', () => {
  const blueIndexes = new Array();
  myInventory.forEach((item, idx) => {
    if (item.rarity === 'blue' && blueIndexes.length < 5) {
      blueIndexes.push(idx);
    }
  });

  if (blueIndexes.length < 5) {
    alert(`Для контракта нужно 5 синих скинов! Сейчас у тебя: ${blueIndexes.length} из 5.`);
    return;
  }

// Удаляем 5 синих скинов с конца, чтобы не сбить индексы
blueIndexes.reverse().forEach(idx => myInventory.splice(idx, 1));
// Выдаём фиолетовый скин
const reward = { name: 'AK-47 | Снежный вихрь', type: 'rifle', c1: '#38bdf8', c2: '#a855f7', rarity: 'purple', price: 240 };
myInventory.unshift(reward);
playWin(true);
saveProgress();
renderInventory();
alert('⚗️ Контракт выполнен! Ты скрафтил: AK-47 | Снежный вихрь!');
});
// Бонус с таймером
bonusBtn.addEventListener('click', () => {
if (bonusBtn.disabled) return;
balance += 500;
saveProgress();
let sec = 30;
bonusBtn.disabled = true;
bonusBtn.innerText = Бонус через ${sec}с;
bonusTimer = setInterval(() => {
sec--;
if (sec <= 0) {
clearInterval(bonusTimer);
bonusBtn.disabled = false;
bonusBtn.innerText = '+ 500 ₽ (Бонус)';
} else {
bonusBtn.innerText = Бонус через ${sec}с;
}
}, 1000);
});
// Запуск при открытии страницы
saveProgress();
renderInventory();