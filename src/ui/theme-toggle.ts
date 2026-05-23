import type { ThemeMode } from '../math/types';

export class ThemeToggle {
  private btn: HTMLElement;
  private mode: ThemeMode;

  constructor(
    private onToggle: (mode: ThemeMode) => void,
    initialMode: ThemeMode = 'dark',
  ) {
    this.mode = initialMode;
    this.btn = document.getElementById('theme-toggle')!;
    this.btn.addEventListener('click', () => this.toggle());
    this.apply();
  }

  private toggle(): void {
    this.mode = this.mode === 'dark' ? 'light' : 'dark';
    this.apply();
    this.onToggle(this.mode);
  }

  private apply(): void {
    document.documentElement.className = `theme-${this.mode}`;
  }

  getMode(): ThemeMode {
    return this.mode;
  }
}
