import { Injectable, signal, effect } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'theme';

  isDark = signal<boolean>(this.getStoredTheme());

  constructor() {
    effect(() => {
      const isDark = this.isDark();
      const htmlEl = this.document.documentElement;

      if (isDark) {
        htmlEl.classList.add('dark');
      } else {
        htmlEl.classList.remove('dark');
      }

      localStorage.setItem(this.storageKey, isDark ? 'dark' : 'light');
    });
  }

  toggle(): void {
    this.isDark.update((v) => !v);
  }

  private getStoredTheme(): boolean {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      return stored === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
