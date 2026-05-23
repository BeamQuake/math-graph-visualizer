import type { FunctionType, FunctionParams } from '../math/types';
import {
  buildExpression,
  buildParamList,
  buildDefaultParams,
  PRESETS,
  getParamDisplay,
} from '../math';
import { formatExpression, renderEToThe } from './format';

export interface ControlsState {
  type: FunctionType;
  params: FunctionParams;
  customExpr: string;
}

export class Controls {
  private orderGroup: HTMLElement;
  private orderSlider: HTMLInputElement;
  private orderValue: HTMLElement;
  private paramsContainer: HTMLElement;

  private formulaText: HTMLElement;
  private presetGrid: HTMLElement;

  private state: ControlsState;
  private listeners: Array<(state: ControlsState) => void> = [];

  constructor() {
    this.orderGroup = document.getElementById('order-group')!;
    this.orderSlider = document.getElementById('function-order') as HTMLInputElement;
    this.orderValue = document.getElementById('order-value')!;
    this.paramsContainer = document.getElementById('params-container')!;
    this.formulaText = document.getElementById('formula-text')!;
    this.presetGrid = document.getElementById('type-presets')!;

    this.state = {
      type: 'polynomial',
      params: buildDefaultParams('polynomial'),
      customExpr: '',
    };

    this.setupOrderSlider();
    this.setupPresets();
    this.buildParamsUI();
  }

  getState(): ControlsState {
    return { ...this.state };
  }

  onChange(fn: (state: ControlsState) => void): void {
    this.listeners.push(fn);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn(this.state));
  }

  setState(state: Partial<ControlsState>): void {
    if (state.type !== undefined) {
      this.state.type = state.type;
      this.state.params = buildDefaultParams(state.type);
      this.buildParamsUI();
    }
    if (state.params) {
      this.state.params = state.params;
      this.buildParamsUI();
    }
    if (state.customExpr !== undefined) {
      this.state.customExpr = state.customExpr;
    }
    this.updateFormulaDisplay();
    this.notify();
  }

  private setupOrderSlider(): void {
    this.orderSlider.addEventListener('input', () => {
      const order = parseInt(this.orderSlider.value);
      this.orderValue.textContent = String(order);
      this.state.params.order = order;

      // Adjust coeffs length
      const needed = order + 1;
      while (this.state.params.coeffs.length < needed) {
        this.state.params.coeffs.push(0);
      }
      while (this.state.params.coeffs.length > needed) {
        this.state.params.coeffs.pop();
      }

      this.buildParamsUI();
      this.updateFormulaDisplay();
      this.notify();
    });
  }

  private setupPresets(): void {
    PRESETS.forEach((preset) => {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.title = preset.description ?? '';

      const dot = document.createElement('span');
      dot.className = `preset-btn__dot preset-btn__dot--${preset.type}`;

      const content = document.createElement('span');
      content.className = 'preset-btn__content';

      const label = document.createElement('span');
      label.className = 'preset-btn__label';
      label.innerHTML = renderEToThe(preset.label);

      const desc = document.createElement('span');
      desc.className = 'preset-btn__desc';
      desc.textContent = preset.description ?? '';

      content.appendChild(label);
      content.appendChild(desc);
      btn.appendChild(dot);
      btn.appendChild(content);
      btn.addEventListener('click', () => this.loadPreset(preset));
      this.presetGrid.appendChild(btn);
    });
  }

  private loadPreset(preset: typeof PRESETS[number]): void {
    if (preset.type === 'polynomial') {
      const order = preset.params.order ?? 3;
      const coeffs: number[] = [];
      for (let i = order; i >= 0; i--) {
        coeffs.push(preset.params[`a${i}`] ?? 0);
      }
      this.state.params = { type: 'polynomial', order, coeffs, extra: {} };
    } else {
      this.state.params = {
        type: preset.type,
        order: 0,
        coeffs: [],
        extra: { ...preset.params },
      };
    }

    this.state.type = preset.type;
    this.state.customExpr = preset.type === 'custom' ? preset.expr : '';
    this.orderGroup.style.display = preset.type === 'polynomial' ? 'flex' : 'none';

    if (preset.type === 'polynomial') {
      this.orderSlider.value = String(preset.params.order ?? 3);
      this.orderValue.textContent = String(preset.params.order ?? 3);
    }

    // Mark active preset
    this.presetGrid.querySelectorAll('.preset-btn').forEach((b) => {
      b.classList.remove('preset-btn--active');
    });
    const btns = this.presetGrid.querySelectorAll('.preset-btn');
    const idx = PRESETS.indexOf(preset);
    if (btns[idx]) btns[idx].classList.add('preset-btn--active');

    this.buildParamsUI();
    this.updateFormulaDisplay();
    this.notify();
  }

  private buildParamsUI(): void {
    this.paramsContainer.innerHTML = '';
    const params = this.state.params;

    if (params.type === 'custom') {
      if (!this.state.customExpr) {
        this.paramsContainer.innerHTML = '<p class="info-empty">Freitext-Modus</p>';
      }
      this.updateFormulaDisplay();
      return;
    }

    if (params.type === 'polynomial') {
      this.buildPolynomialSliders(params);
    } else if (params.type === 'rational') {
      this.buildRationalSliders(params);
    } else {
      this.buildExtraSliders(params);
    }

    this.updateFormulaDisplay();
  }

  private buildPolynomialSliders(params: FunctionParams): void {
    const order = params.order ?? 3;

    for (let i = order; i >= 0; i--) {
      const idx = order - i;
      const label = `a${i}`;
      const display = getParamDisplay(label);

      const value = params.coeffs[idx] ?? 0;

      const div = document.createElement('div');
      div.className = 'param-slider';

      const range = Math.max(1, Math.abs(value) * 2, 5);
      const min = -range;
      const max = range;

      div.innerHTML = `
        <span class="param-slider__label">${display}</span>
        <input type="range" class="param-slider__input slider" min="${min}" max="${max}" step="0.1" value="${value}" data-param-idx="${idx}" />
        <span class="param-slider__value">${value.toFixed(1)}</span>
      `;

      const input = div.querySelector('input')!;
      const valSpan = div.querySelector('.param-slider__value')!;

      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        valSpan.textContent = v.toFixed(1);
        params.coeffs[idx] = v;
        this.state.params = params;
        this.updateFormulaDisplay();
        this.notify();
      });

      this.paramsContainer.appendChild(div);
    }
  }

  private buildExtraSliders(params: FunctionParams): void {
    const paramLabels = buildParamList(params);

    paramLabels.forEach((label) => {
      const display = getParamDisplay(label);

      const value = params.extra[label] ?? 0;

      const div = document.createElement('div');
      div.className = 'param-slider';

      const range = Math.max(1, Math.abs(value) * 2, 10);
      const min = -range;
      const max = range;

      div.innerHTML = `
        <span class="param-slider__label">${display}</span>
        <input type="range" class="param-slider__input slider" min="${min}" max="${max}" step="0.1" value="${value}" data-param-key="${label}" />
        <span class="param-slider__value">${value.toFixed(1)}</span>
      `;

      const input = div.querySelector('input')!;
      const valSpan = div.querySelector('.param-slider__value')!;

      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        valSpan.textContent = v.toFixed(1);
        params.extra[label] = v;
        this.state.params = params;
        this.updateFormulaDisplay();
        this.notify();
      });

      this.paramsContainer.appendChild(div);
    });
  }

  private buildRationalSliders(params: FunctionParams): void {
    const labels = ['n2', 'n1', 'n0', 'd2', 'd1', 'd0'];
    const displayLabels = ['Z₂', 'Z₁', 'Z₀', 'N₂', 'N₁', 'N₀'];

    labels.forEach((label, idx) => {
      const display = displayLabels[idx];
      const value = params.extra[label] ?? 0;

      const div = document.createElement('div');
      div.className = 'param-slider';

      const range = Math.max(1, Math.abs(value) * 2, 10);
      const min = -range;
      const max = range;

      div.innerHTML = `
        <span class="param-slider__label">${display}</span>
        <input type="range" class="param-slider__input slider" min="${min}" max="${max}" step="0.1" value="${value}" data-param-key="${label}" />
        <span class="param-slider__value">${value.toFixed(1)}</span>
      `;

      const input = div.querySelector('input')!;
      const valSpan = div.querySelector('.param-slider__value')!;

      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        valSpan.textContent = v.toFixed(1);
        params.extra[label] = v;
        this.state.params = params;
        this.updateFormulaDisplay();
        this.notify();
      });

      this.paramsContainer.appendChild(div);
    });
  }

  private updateFormulaDisplay(): void {
    let raw: string;
    if (this.state.type === 'custom' && this.state.customExpr) {
      raw = this.state.customExpr;
    } else {
      raw = buildExpression(this.state.params);
    }

    this.formulaText.innerHTML = formatExpression(raw);
  }
}
