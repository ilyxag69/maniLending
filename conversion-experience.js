(() => {
  const demo = document.querySelector("[data-signal-demo]");
  if (!demo) return;

  const signals = {
    subscription: {
      kicker: "Подписки",
      title: "Сервис снова списал 299 ₽",
      copy: "Платёж повторяется каждый месяц. Проверь, пользуешься ли подпиской",
      action: "Что стоит проверить",
      detail: "В учебном примере одинаковые списания повторяются раз в месяц. Это повод открыть историю платежей и проверить условия сервиса, но не доказательство ненужной подписки",
    },
    spending: {
      kicker: "Изменение расходов",
      title: "Доставка стала заметно дороже",
      copy: "За последние две недели заказов стало больше обычного. mani покажет, где произошёл рост",
      action: "Как разобраться в росте",
      detail: "Сравни одинаковые периоды. Например, 6 заказов по 500 ₽ дают 3 000 ₽, а 10 таких же заказов уже 5 000 ₽. Расход вырос из-за количества, а не цены. Это условный пример, не твои операции",
    },
    question: {
      kicker: "Ответ Мани",
      title: "Почему в этом месяце больше трат?",
      copy: "Основной рост дали доставка и несколько повторных покупок. Можно открыть детали по каждой категории",
      action: "Что учесть в ответе",
      detail: "Объяснение стоит сверить с контекстом: отпуск, разовая покупка или изменение привычек. Будущая модель поможет найти возможную причину, но решение остаётся за тобой",
    },
  };

  const kicker = demo.querySelector("[data-signal-kicker]");
  const title = demo.querySelector("[data-signal-title]");
  const copy = demo.querySelector("[data-signal-copy]");
  const action = demo.querySelector("[data-signal-action]");
  const detail = demo.querySelector("[data-signal-details]");
  let activeSignal = "subscription";
  action.addEventListener("click", () => {
    detail.hidden = !detail.hidden;
    action.setAttribute("aria-expanded", String(!detail.hidden));
    detail.textContent = signals[activeSignal].detail;
    if (!detail.hidden) window.ManiAnalytics?.track("signal_example_open", { action: activeSignal });
  });
  const share = document.createElement("button");
  share.type = "button";
  share.className = "signal-share";
  share.textContent = "Отправить пример другу";
  demo.querySelector(".nm-live-signal").append(share);
  share.addEventListener("click", async () => {
    const text = `Пример будущего сигнала mani: ${signals[activeSignal].title}. ${signals[activeSignal].copy}. Первый релиз готовится к выходу, умный анализ появится в следующем обновлении`;
    try {
      if (navigator.share) await navigator.share({ title: "mani", text, url: "https://moimani.ai/" });
      else { await navigator.clipboard.writeText(`${text}\nhttps://moimani.ai/`); share.textContent = "Пример и ссылка скопированы"; }
      window.ManiAnalytics?.track("demo_share", { action: activeSignal, share_target: navigator.share ? "web_share" : "clipboard" });
    } catch (error) {
      if (error.name !== "AbortError") share.textContent = "Не удалось поделиться. Попробуй ещё раз";
    }
  });

  demo.querySelectorAll("[data-signal]").forEach((button) => {
    button.addEventListener("click", () => {
      const signal = signals[button.dataset.signal];
      if (!signal) return;
      activeSignal = button.dataset.signal;
      detail.hidden = true;
      action.setAttribute("aria-expanded", "false");

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
