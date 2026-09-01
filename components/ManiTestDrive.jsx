"use client";

import { useMemo, useState } from "react";

const formatRubles = (value) => `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;

function RangeControl({ label, period, hint, value, min, max, onChange }) {
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <label className="mt-6 block">
      <span className="flex items-center justify-between gap-3 text-[16px] font-semibold text-[#071632]">
        <span>{label} <small className="font-normal text-[#6b7890]">({period})</small></span>
        <output className="grid h-9 min-w-14 place-items-center rounded-xl border border-[#dbe6f5] bg-white shadow-[0_7px_18px_rgba(44,87,145,.07)]">{value}</output>
      </span>
      <input className="mani-range mt-3 h-5 w-full appearance-none bg-transparent" type="range" min={min} max={max} step="1" value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ "--fill": `${progress}%` }} />
      <small className="mt-2 block text-[13px] leading-5 text-[#6b7890]">{hint}</small>
    </label>
  );
}

function ModeButton({ mode, active, image, children, onClick }) {
  const activeStyle = mode === "jester" ? "border-[#ff7b36] bg-[#fff8f3] text-[#ff5a00] shadow-[0_10px_25px_rgba(255,90,0,.12)]" : "border-[#57baff] bg-[#f4fbff] text-[#1688ff] shadow-[0_10px_25px_rgba(22,136,255,.12)]";
  return <button type="button" onClick={onClick} className={`flex min-h-[68px] items-center justify-center gap-2 rounded-2xl border bg-white font-semibold transition hover:-translate-y-0.5 ${active ? activeStyle : "border-[#dbe6f5] text-[#13213d]"}`}><img className="h-14 w-14 object-contain" src={image} alt="" />{children}</button>;
}

function ManiMascot({ mode }) {
  const image = mode === "jester" ? "/assets/newmani/interactive/jester.webp" : "/assets/newmani/interactive/motivator.webp";
  return <div className="grid size-28 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle,#fff_30%,rgba(255,119,34,.12)_72%,transparent_73%)]"><img className="mtd-react-float size-28 object-contain drop-shadow-[0_13px_18px_rgba(255,93,0,.13)]" src={image} alt={mode === "jester" ? "Весельчак Mani" : "Мотиватор Mani"} /></div>;
}

function MetricRow({ icon, label, value, blue = false }) {
  return <div className="grid min-h-14 grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 rounded-[17px] border border-[#e6edf7] bg-white/85 px-3 py-1.5 shadow-[0_8px_22px_rgba(42,77,128,.055)]"><span className={`grid size-10 place-items-center rounded-xl ${blue ? "bg-[#edf6ff] text-[#1688ff]" : "bg-[#fff4ed] text-[#ff650e]"}`}>{icon}</span><b className="text-sm font-medium">{label}</b><strong className={`rounded-xl px-3 py-2 text-sm ${blue ? "bg-[#edf6ff] text-[#1688ff]" : "bg-[#f3f7fd]"}`}>{value}</strong></div>;
}

function RubleCoin() {
  return <div className="relative grid size-28 shrink-0 place-items-center rounded-full border border-[#ff945a52] before:absolute before:inset-3 before:rounded-full before:border before:border-[#ff935859] after:absolute after:-inset-3 after:rounded-full after:border after:border-dashed after:border-[#ff935859]"><i className="grid size-16 place-items-center rounded-full border border-[#ffd8c0] bg-white/75 text-3xl not-italic text-[#ff7a1a] shadow-[0_0_28px_rgba(255,99,10,.2)]">₽</i></div>;
}

export default function ManiTestDrive() {
  const [subscriptions, setSubscriptions] = useState(2);
  const [impulseBuys, setImpulseBuys] = useState(3);
  const [mascotMode, setMascotMode] = useState("jester");
  const annualLoss = subscriptions * 500 * 12 + impulseBuys * 350 * 52;
  const monthlySaving = Math.round(annualLoss / 12);
  const annualLossFormatted = useMemo(() => formatRubles(annualLoss), [annualLoss]);
  const monthlySavingFormatted = useMemo(() => formatRubles(monthlySaving), [monthlySaving]);
  const assistantMessage = useMemo(() => {
    if (mascotMode === "jester") {
      if (annualLoss === 0) return "Ноль утечек? Либо ты финансовый ниндзя, либо сейчас очень уверенно врёшь ползункам. Ладно, засчитываю победу. Бюджет сегодня может выдохнуть.";
      if (annualLoss <= 12000) return `Всего ${annualLossFormatted} в год. Не пожар, но деньги понемногу уносят тапочки из прихожей. Поймаем мелких беглецов, пока они не позвали друзей.`;
      if (annualLoss <= 30000) return `${annualLossFormatted} в год испаряются без аплодисментов. Это уже не мелочь из кармана, а несколько хороших ужинов, которые съел автоплатёж. Прикроем эту лавочку.`;
      if (annualLoss <= 70000) return `Ого... Твои деньги устроили профессиональный побег! На эти ${annualLossFormatted} в год можно было слетать в отпуск, но ты предпочёл спонсировать сервисы, которые даже не открываешь. Красиво жить не запретишь, да?`;
      return `${annualLossFormatted} в год?! Бюджет уже сидит в углу и шепчет: «Спроси у него, он вообще видел эти цифры?» Это не утечка, это финансовый аквапарк. Срочно перекрываем краны.`;
    }
    if (annualLoss === 0) return "Отлично: сейчас расчёт не показывает скрытых потерь. Это сильная база. Я помогу сохранить такой порядок и вовремя замечать изменения, если они появятся.";
    if (annualLoss <= 12000) return `У тебя совсем небольшие утечки, около ${annualLossFormatted} в год. Ты уже хорошо держишь финансы в руках. Давай спокойно найдём пару точек роста и направим эти деньги на то, что действительно важно.`;
    if (annualLoss <= 30000) return `Сейчас незаметно уходит около ${annualLossFormatted} в год. Ничего страшного: такие траты легко пропустить. Разберём их вместе без резких ограничений и вернём деньгам понятную цель.`;
    if (annualLoss <= 70000) return `Я вижу, что сейчас уходит около ${annualLossFormatted} в год. Не переживай и не кори себя. Такие скрытые маркеры трудно отследить вручную. Мы разберёмся вместе и шаг за шагом вернём полный контроль.`;
    return `${annualLossFormatted} в год выглядит серьёзно, но это не повод паниковать. Большая сумма складывается из понятных привычек. Начнём с самых простых изменений, сохраним комфорт и постепенно высвободим заметную часть бюджета.`;
  }, [annualLoss, annualLossFormatted, mascotMode]);
  const assistantDetail = useMemo(() => {
    if (annualLoss === 0) return "";
    const jester = ["Автоплатежи уже открыли шампанское за твой счёт.", "Мелкие траты снова притворились незаметными. Почти убедительно.", "Подписки живут тихо, платишь почему-то ты.", "Твой бюджет просил передать, что он не бездонный банкомат.", "Каждая покупка вроде мелочь, а вместе они уже собрали профсоюз.", "Деньги уходят красиво. Жаль, что без твоего согласия.", "С таким темпом копилка скоро начнёт брать кредит.", "Хорошая новость: виновники уже светятся на табло."];
    const motivator = ["Начнём с одного простого изменения.", "Тебе не нужно менять всю жизнь. Выберем лёгкие точки экономии.", "Даже небольшая корректировка даст заметный результат за год.", "Ты уже сделал важное и спокойно посмотрел на цифры.", "Сначала сохраним комфорт, затем уберём лишнее.", "Эти деньги можно направить на цель, которая действительно радует.", "Порядок начинается не с запретов, а с ясной картины.", "Каждая найденная утечка даёт больше свободы для твоих планов."];
    const details = mascotMode === "jester" ? jester : motivator;
    return details[(subscriptions * 16 + impulseBuys) % details.length];
  }, [annualLoss, impulseBuys, mascotMode, subscriptions]);

  return <section id="test-drive" className="relative overflow-hidden bg-[#f7faff] py-9 text-[#071632]">
    <div className="relative mx-auto grid w-[min(1440px,calc(100%_-_32px))] grid-cols-[.94fr_1.06fr] gap-16 rounded-[36px] border border-[#96afdc40] bg-[linear-gradient(135deg,#fff,#f7faff_58%,#eef5ff)] p-16 shadow-[0_28px_80px_rgba(45,79,130,.09)] max-xl:grid-cols-1 max-md:w-[calc(100%_-_16px)] max-md:gap-7 max-md:rounded-3xl max-md:p-4">
      <div><div className="inline-flex min-h-12 items-center rounded-[18px] border border-[#96afdc4d] bg-white/80 px-4 shadow-lg">Тест-драйв Mani.ai</div><h2 className="my-7 text-[66px] font-semibold leading-none tracking-[-.045em] max-md:text-[40px]">Прикинь свои<br />скрытые <span className="text-[#ff5a00]">расходы</span></h2><p className="mb-7 text-xl leading-7 text-[#5d6b86] max-md:text-base">Пара движений, и Mani покажет,<br />сколько денег может утекать за год.</p>
        <div className="rounded-[27px] border border-[#96afdc40] bg-white/85 p-8 shadow-[0_18px_48px_rgba(42,76,127,.08)] max-md:p-5"><h3 className="text-lg font-bold">Панель управления</h3><RangeControl label="Забытые подписки" period="в месяц" hint="Стриминги, спортзалы, сервисы, про которые ты забыл" value={subscriptions} min={0} max={10} onChange={setSubscriptions} /><RangeControl label="Импульсивные траты" period="в неделю" hint="Кофе на бегу, такси где можно пройтись, спонтанные маркетплейсы" value={impulseBuys} min={0} max={15} onChange={setImpulseBuys} /><fieldset className="mt-6 grid grid-cols-2 gap-3 max-md:grid-cols-1"><legend className="mb-3 font-bold">Режим Мани</legend><ModeButton mode="jester" active={mascotMode === "jester"} image="/assets/newmani/interactive/jester.webp" onClick={() => setMascotMode("jester")}>Весельчак</ModeButton><ModeButton mode="motivator" active={mascotMode === "motivator"} image="/assets/newmani/interactive/motivator.webp" onClick={() => setMascotMode("motivator")}>Мотиватор</ModeButton></fieldset><p className="mt-5 text-xs leading-5 text-[#66758f]">ⓘ Годовые потери = подписки × 500 × 12 + импульсивные траты × 350 × 52</p><p className="mt-2 text-[11px] leading-4 text-[#7a879c]">Расчёт ориентировочный и основан на средних значениях.</p></div>
      </div>
      <div className="self-center rounded-[34px] border border-[#96afdc40] bg-white/90 p-7 shadow-[0_25px_65px_rgba(45,82,138,.13)] max-md:rounded-3xl max-md:p-3"><div className="flex min-h-40 items-center justify-between gap-4 overflow-hidden rounded-[25px] border border-[#ffe4d5] bg-[linear-gradient(115deg,#fffaf6,#fff1e8)] p-6 shadow-[0_14px_34px_rgba(255,90,0,.11)]"><div><small>Мани мог бы подсветить:</small><strong className="my-2 block whitespace-nowrap text-[46px] leading-none tracking-[-.035em] text-[#ff5a00] max-md:text-[34px]">{annualLossFormatted} <em className="text-2xl not-italic font-medium">/ год</em></strong><p className="text-sm text-[#52617b]">Потенциальные скрытые потери</p></div><RubleCoin /></div><div className="my-4 grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3 max-md:grid-cols-[82px_minmax(0,1fr)]"><ManiMascot mode={mascotMode} /><p className="rounded-3xl border border-[#e6edf7] bg-white p-5 text-[15px] leading-6 shadow-[0_13px_32px_rgba(43,78,128,.08)] max-md:p-4 max-md:text-[13px]">{assistantMessage} {assistantDetail}</p></div><div className="grid gap-2"><MetricRow label="Подозрительные подписки:" value={subscriptions} icon="▣" /><MetricRow label="Импульсивных трат в неделю:" value={impulseBuys} icon="♧" /><MetricRow blue label="Потенциал экономии в месяц:" value={monthlySavingFormatted} icon="↗" /></div><a href="#early-access" className="mt-4 flex min-h-16 items-center justify-center gap-6 rounded-[17px] bg-[linear-gradient(180deg,#ff7d20,#ff5900)] px-5 text-center font-bold text-white shadow-[0_15px_30px_rgba(255,90,0,.24)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_36px_rgba(255,90,0,.31)]">Занять место в раннем доступе бесплатно <i className="text-2xl not-italic">→</i></a></div>
    </div>
    <style jsx>{`.mani-range::-webkit-slider-runnable-track{height:5px;border-radius:999px;background:linear-gradient(90deg,#ff650e 0 var(--fill),#e7edf7 var(--fill) 100%)}.mani-range::-webkit-slider-thumb{width:24px;height:24px;margin-top:-10px;appearance:none;border:3px solid #fff;border-radius:50%;background:#fff;box-shadow:0 3px 11px rgba(22,136,255,.35),0 0 0 1px #dbe5f4}.mtd-react-float{animation:mtdReactFloat 3.6s ease-in-out infinite}@keyframes mtdReactFloat{50%{transform:translateY(-8px)}}`}</style>
  </section>;
}
