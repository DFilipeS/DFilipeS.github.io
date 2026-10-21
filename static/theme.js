// CSS follows the OS automatically when the selected theme is "system".
const root = document.documentElement;
const picker = document.querySelector('.theme-switch');
const controls = picker.querySelectorAll('input[name="theme"]');
const currentTheme = root.dataset.theme || 'system';
for (const control of controls) control.checked = control.value === currentTheme;

picker.addEventListener('change', (event) => {
  const theme = event.target.value;
  if (!['light', 'dark', 'system'].includes(theme)) return;
  root.dataset.theme = theme;
  // A newly selected explicit-mode icon disappears; keep keyboard focus visible.
  if (picker.contains(document.activeElement) && !document.activeElement.getClientRects().length) {
    picker.querySelector('input[value="system"]').focus({ preventScroll: true });
  }
  try {
    localStorage.setItem('color-theme', theme);
  } catch {
    // The choice still works for this page when storage is unavailable.
  }
});
