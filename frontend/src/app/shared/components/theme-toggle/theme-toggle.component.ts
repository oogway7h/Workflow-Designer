import { Component, inject } from '@angular/core';
import { LucideAngularModule, Sun, Moon } from 'lucide-angular';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <button
      (click)="themeService.toggle()"
      class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
      [attr.aria-label]="themeService.isDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
    >
      @if (themeService.isDark()) {
        <lucide-icon [img]="sunIcon" [size]="18"></lucide-icon>
      } @else {
        <lucide-icon [img]="moonIcon" [size]="18"></lucide-icon>
      }
    </button>
  `,
})
export class ThemeToggleComponent {
  readonly themeService: ThemeService = inject(ThemeService);
  readonly sunIcon = Sun;
  readonly moonIcon = Moon;
}
