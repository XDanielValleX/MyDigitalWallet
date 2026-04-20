import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

// Fix for lazy-loaded chunks resolving relative to the current route (e.g. /tabs/...)
// when Webpack's publicPath is empty.
// Webpack replaces this symbol at build-time.
declare let __webpack_public_path__: string;

(() => {
  try {
    const baseHref = document.querySelector('base')?.getAttribute('href') ?? '/';
    const baseUrl = new URL(baseHref, window.location.href);
    const pathname = baseUrl.pathname || '/';
    __webpack_public_path__ = pathname.endsWith('/') ? pathname : `${pathname}/`;
  } catch {
    __webpack_public_path__ = '/';
  }
})();

// Theme bootstrap (default: system)
(() => {
  try {
    const key = 'mdw-theme-mode';
    const stored = localStorage.getItem(key);
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const isDark = stored === 'dark' || (stored !== 'light' && mql.matches);
    const targets = [document.documentElement, document.body];
    for (const el of targets) {
      el?.classList.toggle('ion-palette-dark', isDark);
      el?.classList.toggle('dark', isDark); // legacy compatibility
    }
  } catch {
    // ignore
  }
})();

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
