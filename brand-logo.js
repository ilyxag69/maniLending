(function initManiBrandLogo() {
  const storageKey = "maniBrandLogoVariantV1";
  const allowed = new Set(["black", "orange", "blue"]);
  let variant = "";

  try {
    variant = sessionStorage.getItem(storageKey) || "";
  } catch (_) {}

  if (!allowed.has(variant)) {
    const random = globalThis.crypto?.getRandomValues
      ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296
      : Math.random();
    variant = random < 0.5 ? "black" : random < 0.8 ? "orange" : "blue";
    try {
      sessionStorage.setItem(storageKey, variant);
    } catch (_) {}
  }

  document.documentElement.dataset.maniLogo = variant;
  const source = `/assets/brand/mani-${variant}.png`;
  const applySource = () => {
    document.querySelectorAll("img[data-brand-logo]").forEach((image) => {
      if (image.getAttribute("src") !== source) image.setAttribute("src", source);
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applySource, { once: true });
  else applySource();
})();
