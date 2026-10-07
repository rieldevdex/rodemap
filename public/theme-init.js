// Applies the saved theme before first paint (no flash). Mirrors src/state/persistence.ts.
(function () {
  try {
    var raw = window.localStorage.getItem('rodemap:v1');
    if (!raw) return;
    var theme = JSON.parse(raw).theme;
    if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    /* storage unavailable: follow the system setting */
  }
})();
