export interface DerivativeState {
  1: boolean;
  2: boolean;
  3: boolean;
}

export type DerivativeOrder = 1 | 2 | 3;

export class DerivativeToggles {
  private state: DerivativeState = { 1: false, 2: false, 3: false };
  private helpersOn = false;
  private labelsOn = true;
  private integralOn = false;
  private listeners: Array<(state: DerivativeState) => void> = [];
  private helperListeners: Array<(on: boolean) => void> = [];
  private labelListeners: Array<(on: boolean) => void> = [];
  private integralListeners: Array<(on: boolean) => void> = [];

  constructor() {
    document.querySelectorAll('[data-derivative]').forEach((el) => {
      const input = el.querySelector('.toggle-checkbox') as HTMLInputElement;
      const order = parseInt(el.getAttribute('data-derivative')!) as DerivativeOrder;
      input.addEventListener('change', () => {
        this.state[order] = input.checked;
        this.notify();
      });
    });

    const helpersToggle = document.querySelector('#toggle-helpers .toggle-checkbox') as HTMLInputElement;
    if (helpersToggle) {
      helpersToggle.addEventListener('change', () => {
        this.helpersOn = helpersToggle.checked;
        this.helperListeners.forEach((fn) => fn(this.helpersOn));
      });
    }

    const labelsToggle = document.querySelector('#toggle-labels .toggle-checkbox') as HTMLInputElement;
    if (labelsToggle) {
      labelsToggle.addEventListener('change', () => {
        this.labelsOn = labelsToggle.checked;
        this.labelListeners.forEach((fn) => fn(this.labelsOn));
      });
    }

    const integralToggle = document.querySelector('#toggle-integral .toggle-checkbox') as HTMLInputElement;
    if (integralToggle) {
      integralToggle.addEventListener('change', () => {
        this.integralOn = integralToggle.checked;
        this.integralListeners.forEach((fn) => fn(this.integralOn));
      });
    }
  }

  onChange(fn: (state: DerivativeState) => void): void {
    this.listeners.push(fn);
  }

  onHelpersChange(fn: (on: boolean) => void): void {
    this.helperListeners.push(fn);
  }

  onLabelsChange(fn: (on: boolean) => void): void {
    this.labelListeners.push(fn);
  }

  onIntegralChange(fn: (on: boolean) => void): void {
    this.integralListeners.push(fn);
  }

  getState(): DerivativeState {
    return { ...this.state };
  }

  getHelpersOn(): boolean {
    return this.helpersOn;
  }

  getLabelsOn(): boolean {
    return this.labelsOn;
  }

  getIntegralOn(): boolean {
    return this.integralOn;
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn(this.state));
  }
}
