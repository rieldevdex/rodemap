// Applies the saved theme, appearance mode and text density before first paint (no flash).
// Mirrors src/state/persistence.ts and applyTheme/applyAppearance in src/state/effects.ts.
(function () {
  var root = document.documentElement;
  var mode = 'lo-trinh';
  var density = 'compact';
  try {
    var raw = window.localStorage.getItem('rodemap:v1');
    if (raw) {
      var saved = JSON.parse(raw);
      if (saved.theme === 'light' || saved.theme === 'dark') root.setAttribute('data-theme', saved.theme);
      if (['lo-trinh', 'ruc-ro', 'ap-phich', 'diu-nhe'].indexOf(saved.mode) >= 0) mode = saved.mode;
      if (['full', 'compact', 'minimal'].indexOf(saved.density) >= 0) density = saved.density;
    }
  } catch (e) {
    /* storage unavailable: defaults and the system setting */
  }
  root.setAttribute('data-mode', mode);
  root.setAttribute('data-density', density);
})();
