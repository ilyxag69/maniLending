/* Local review UI, injected only by serve-local.mjs when ?review=web-beta */
(() => {
  if (!["127.0.0.1", "localhost", "[::1]"].includes(location.hostname) || new URL(location.href).searchParams.get("review") !== "web-beta") return;
  const labels = {
    "web-beta-cta": "Кнопка сразу открывает веб приложение, а не лист ожидания",
    "web-beta-guide-cta": "В гайде: приглашение попробовать веб версию, первая тысяча бесплатно навсегда и ссылка на обратную связь",
    "web-beta-guide-copy": "Текст гайда согласован с открытым тестом, будущие возможности не выдаются за доступные",
    "web-beta-guides-hub": "Гайды: новый компактный вход в открытый веб тест",
    "web-beta-faq-intro": "FAQ: новый вводный текст про открытый веб тест",
    "web-beta-faq-access": "Как начать сейчас: веб приложение и инструкция вместо ожидания запуска",
    "web-beta-faq-offer": "Условия доступа: только первые 1000 бесплатно навсегда, в ответ просим обратную связь",
    "web-beta-faq-feedback": "Как повлиять на mani: идеи и ошибки через форму или приложение",
    "web-beta-faq-help": "Помощь с запуском, подключением и обратной связью",
    "store-notification-consent": "Уточнена цель заявки: уведомление о магазинах, не регистрация в приложении",
  };
  const allChanges = [...document.querySelectorAll("[data-release-change]")];
  allChanges.forEach((element) => element.classList.add("web-beta-review-change"));
  const changes = allChanges.filter((element) => element.tagName === "DIALOG" || (element.getClientRects().length && getComputedStyle(element).visibility !== "hidden"));
  changes.forEach((element, index) => { element.dataset.reviewNumber = String(index + 1); });
  const dock = document.createElement("div");
  dock.className = "web-beta-review-dock";
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = `Правки: ${changes.length}`;
  button.setAttribute("aria-haspopup", "dialog");
  const clean = document.createElement("a");
  const cleanUrl = new URL(location.href);
  cleanUrl.searchParams.delete("review");
  clean.href = cleanUrl.href;
  clean.textContent = "Без подсветки";
  dock.append(button, clean);
  const dialog = document.createElement("dialog");
  dialog.className = "web-beta-review-dialog";
  dialog.setAttribute("aria-labelledby", "web-beta-review-title");
  const heading = document.createElement("h2");
  heading.id = "web-beta-review-title";
  heading.textContent = "Локальная пересборка сайта Мани";
  const note = document.createElement("p");
  note.textContent = "Подсветка существует только в локальном просмотре, на домен ничего не опубликовано";
  const nav = document.createElement("nav");
  nav.setAttribute("aria-label", "Страницы с изменениями");
  for (const [path, name] of [["/", "Главная"], ["/guides", "Гайды"], ["/faq", "FAQ"], ["/web-version", "Инструкция"]]) {
    const link = document.createElement("a");
    link.href = `${path}?review=web-beta`;
    link.textContent = name;
    nav.append(link);
  }
  const list = document.createElement("ol");
  changes.forEach((element) => {
    const item = document.createElement("li");
    const go = document.createElement("button");
    go.type = "button";
    go.textContent = labels[element.dataset.releaseChange] || element.dataset.releaseChange;
    go.addEventListener("click", () => {
      dialog.close();
      if (element.tagName === "DIALOG" && !element.open) element.showModal();
      else element.scrollIntoView({ behavior: "instant", block: "start" });
    });
    item.append(go);
    list.append(item);
  });
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Вернуться к просмотру";
  close.className = "web-beta-review-close";
  close.addEventListener("click", () => dialog.close());
  const normalLink = clean.cloneNode(true);
  dialog.append(heading, note, nav, list, close, normalLink);
  button.addEventListener("click", () => dialog.showModal());
  document.body.append(dock, dialog);
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || link === clean || link === normalLink || link.hasAttribute("data-open-waitlist") || link.hasAttribute("download")) return;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin || link.getAttribute("href").startsWith("#")) return;
    if (/\.(?:js|css|png|jpg|webp|svg|xml|txt|json|pdf)$/i.test(destination.pathname) || destination.pathname.startsWith("/api/")) return;
    destination.searchParams.set("review", "web-beta");
    link.href = destination.href;
  });
})();
