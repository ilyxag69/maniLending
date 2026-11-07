(() => {
  const preview = document.querySelector('[data-product-preview]');
  preview?.querySelectorAll('[data-product-screen]').forEach(button => {
    button.addEventListener('click', () => {
      preview.dataset.screen = button.dataset.productScreen;
      preview.querySelectorAll('[data-product-screen]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      window.ManiAnalytics?.track('signal_example_open', {action: 'product_screen_' + button.dataset.productScreen});
    });
  });
  const share = document.querySelector('[data-share-example]');
  const result = document.querySelector('[data-example-share-result]');
  share?.addEventListener('click', async () => {
    const text = 'Мани помогает разобраться в расходах. В условном примере доставка выросла с 4 400 до 6 540 ₽, а за суммой можно посмотреть операции. Веб версия уже доступна на iPhone и Android';
    try {
      if (navigator.share) await navigator.share({title:'Мани: от суммы к понятному вопросу',text,url:'https://moimani.ai/'});
      else { const ok = await copyText(`${text}\nhttps://moimani.ai/`); if(!ok)throw new Error('copy'); result.textContent='Пример и ссылка скопированы'; }
      window.ManiAnalytics?.track('demo_share',{action:'delivery',share_target:navigator.share?'web_share':'clipboard'});
    } catch(error) { if(error.name!=='AbortError')result.textContent='Не удалось поделиться, попробуй ещё раз'; }
  });
  document.querySelector('.clarity-operations')?.addEventListener('toggle',event=>{
    const detail=event.currentTarget;
    detail.querySelector('summary span').textContent=detail.open?'Скрыть операции':'Показать операции';
    if(detail.open)window.ManiAnalytics?.track('signal_example_open',{action:'delivery_operations'});
  });
})();