(() => {
  const demo = document.querySelector("[data-signal-demo]");
  if (!demo) return;

  const signals = {
    subscription: {
      kicker: "Подписки",
      title: "Spotify снова списал 299 ₽",
      copy: "Платёж повторяется каждый месяц. Проверь, пользуешься ли подпиской",
      action: "Посмотреть подписку",
    },
    spending: {
      kicker: "Изменение расходов",
      title: "Доставка стала заметно дороже",
      copy: "За последние две недели заказов стало больше обычного. mani покажет, где произошёл рост",
      action: "Разобрать расходы",
    },
    question: {
      kicker: "Ответ Мани",
      title: "Почему в этом месяце больше трат?",
      copy: "Основной рост дали доставка и несколько повторных покупок. Можно открыть детали по каждой категории",
      action: "Спросить Мани",
    },
  };

  const kicker = demo.querySelector("[data-signal-kicker]");
  const title = demo.querySelector("[data-signal-title]");
  const copy = demo.querySelector("[data-signal-copy]");
  const action = demo.querySelector("[data-signal-action]");

  demo.querySelectorAll("[data-signal]").forEach((button) => {
    button.addEventListener("click", () => {
      const signal = signals[button.dataset.signal];
      if (!signal) return;

      demo.querySelectorAll("[data-signal]").forEach((item) => {
        const isActive = item === button;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-pressed", String(isActive));
      });

      kicker.textContent = signal.kicker;
      title.textContent = signal.title;
      copy.textContent = signal.copy;
      action.textContent = signal.action;

      if (window.ManiAnalytics?.track) {
        window.ManiAnalytics.track("hero_signal_change", { action: button.dataset.signal });
      }
    });
  });

  const future = document.querySelector(".nm-future-compact");
  const futureLabel = future?.querySelector("summary > b");
  if (future && futureLabel) {
    const syncFutureLabel = () => {
      futureLabel.textContent = future.open ? "Скрыть планы" : "Показать планы";
    };
    future.addEventListener("toggle", syncFutureLabel);
    if (window.location.hash === "#future") future.open = true;
    syncFutureLabel();
  }
})();
