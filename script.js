const toast = document.querySelector("[data-toast]");
const menuButton = document.querySelector(".menu");
const mobileMenu = document.querySelector(".mobile-menu-panel");
const toneSection = document.querySelector(".tone");
const toneSwitch = document.querySelector(".tone-switch");
const toneButtons = document.querySelectorAll("[data-tone]");
const toneImage = document.querySelector("[data-tone-image]");
const toneNote = document.querySelector("[data-tone-note]");
const toneMessages = document.querySelector("[data-tone-messages]");
const roadmapGrid = document.querySelector(".roadmap-grid");
let toastTimer;
let currentTone = "motivator";

const links = {
  apple: "",
  google: "",
  youtube: "",
  instagram: "",
  telegram: "",
  x: "",
};

const tones = {
  motivator: {
    image: "assets/mani-motivator.png",
    note: "Мягко направляет. Помогает поверить в себя, даже когда бюджет трещит.",
    messages: ["Я рядом.<br />Мы разберёмся.", "Ты справишься.<br />Давай по шагам."],
  },
  roaster: {
    image: "assets/mani-prozharschik.png",
    note: "Жёстко спасает. Говорит правду, чтобы ты наконец взял деньги под контроль.",
    messages: ["Опять? Серьёзно?<br />Давай без соплей.", "Ты облажался.<br />Прямо сейчас исправим!"],
  },
};

const roadmapItems = [
  {
    kicker: "Скоро в Mani.ai",
    title: "Беспроцентный период по кредиткам",
    text: "Mani покажет даты и суммы беспроцентного периода. Не даст банкам нажиться на вас.",
  },
  {
    kicker: "Скоро в Mani.ai",
    title: "Цели и челленджи",
    text: "Достигайте цели с игровой механикой. Mani поможет копить и поощрит за успехи.",
  },
  {
    kicker: "Скоро в Mani.ai",
    title: "Сколько стоит моя жизнь",
    text: "Квартиры, машины, инвестиции, крипта. Mani покажет реальную картину ваших активов и пассивов.",
  },
  {
    kicker: "Скоро в Mani.ai",
    title: "Детальные расходы по чекам",
    text: "Навели камеру на чек - Mani сам добавит сумму, категорию и магазин. Без ручного ввода.",
  },
];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function openConfiguredLink(key, fallback) {
  if (links[key]) {
    window.open(links[key], "_blank", "noopener,noreferrer");
  } else {
    showToast(fallback);
  }
}

function setTone(name) {
  const tone = tones[name];
  if (!tone) return;
  currentTone = name;
  toneSection.classList.toggle("roaster", name === "roaster");
  toneButtons.forEach((button) => button.classList.toggle("active", button.dataset.tone === name));
  toneImage.classList.add("is-changing");
  setTimeout(() => {
    toneImage.src = tone.image;
    toneImage.classList.remove("is-changing");
  }, 120);
  toneNote.textContent = tone.note;
  toneMessages.querySelectorAll(".message-card b").forEach((node, index) => {
    node.innerHTML = tone.messages[index] || "";
  });
}

toneButtons.forEach((button) => {
  button.addEventListener("click", () => setTone(button.dataset.tone));
});

if (toneSwitch) {
  toneSwitch.addEventListener("click", (event) => {
    const rect = toneSwitch.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const isDesktopSwitch = window.matchMedia("(min-width: 701px)").matches;

    if (!isDesktopSwitch) return;

    const switchStart = parseFloat(getComputedStyle(toneSwitch).getPropertyValue("--switch-left")) || 132;
    const switchWidth = parseFloat(getComputedStyle(toneSwitch).getPropertyValue("--switch-width")) || 92;
    if (x < switchStart || x > switchStart + switchWidth) return;

    setTone(currentTone === "motivator" ? "roaster" : "motivator");
  });
}

if (roadmapGrid && window.matchMedia("(min-width: 701px)").matches) {
  [...roadmapGrid.querySelectorAll(":scope > img")].forEach((image, index) => {
    const item = roadmapItems[index];
    if (!item) return;
    const card = document.createElement("article");
    card.className = "roadmap-card";
    const content = document.createElement("div");
    content.innerHTML = `<small>${item.kicker}</small><h3>${item.title}</h3><p>${item.text}</p>`;
    image.alt = item.title;
    roadmapGrid.insertBefore(card, image);
    card.append(image, content);
  });
}

document.querySelectorAll("[data-download]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const target = link.dataset.download;
    const label = target === "apple" ? "App Store" : "Google Play";
    openConfiguredLink(target, `Ссылка на ${label} пока не задана. Подставим реальный URL скачивания.`);
  });
});

document.querySelectorAll("[data-social]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openConfiguredLink(link.dataset.social, "Ссылка на соцсеть пока не задана.");
  });
});

const initialTone = new URLSearchParams(window.location.search).get("tone");
if (initialTone) {
  setTone(initialTone);
}

if (menuButton && mobileMenu) {
  menuButton.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("menu-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    mobileMenu.setAttribute("aria-hidden", String(!isOpen));
  });

  mobileMenu.querySelectorAll("a[href^='#']").forEach((link) => {
    link.addEventListener("click", () => {
      document.body.classList.remove("menu-open");
      menuButton.setAttribute("aria-expanded", "false");
      mobileMenu.setAttribute("aria-hidden", "true");
    });
  });
}
