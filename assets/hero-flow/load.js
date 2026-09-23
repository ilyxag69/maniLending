// Keep the existing image when motion is reduced or data saving is requested
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && !navigator.connection?.saveData) {
  import('./scene.js?v=2').catch(() => {
    clearTimeout(window.heroFlowTimeout);
    document.documentElement.classList.remove('hero-flow-pending');
  });
}
