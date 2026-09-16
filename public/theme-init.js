(function () {
  try {
    var theme = localStorage.getItem('app-theme') || 'light';
    var isDark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {
    // por si localStorage no está disponible en algún WebView
  }
})();