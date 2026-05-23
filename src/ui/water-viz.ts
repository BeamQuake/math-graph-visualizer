export class PencilViz {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private t = 0;
  private animId = 0;
  private a = 3;
  private b = 4;
  private delta = Math.PI / 2;
  private hue = 0;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.resize();
    this.newPattern();
    window.addEventListener('resize', () => this.resize());
    this.tick();
  }

  private resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
  }

  private newPattern() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.t = 0;
    this.a = 2 + Math.floor(Math.random() * 5);
    this.b = 3 + Math.floor(Math.random() * 5);
    this.delta = Math.random() * Math.PI;
    this.hue = Math.random() * 360;
  }

  private point(t: number) {
    const decay = Math.exp(-t * 0.01);
    const s = Math.min(this.canvas.width, this.canvas.height) * 0.42 * decay;
    return {
      x: this.canvas.width / 2 + Math.sin(this.a * t + this.delta) * s,
      y: this.canvas.height / 2 + Math.sin(this.b * t) * s,
    };
  }

  private strokeColor() {
    const hue = (this.hue + this.t * 12) % 360;
    const sat = 60 + Math.random() * 30;
    const lit = 50 + Math.random() * 30;
    const alpha = 0.08 + Math.random() * 0.12;
    return `hsla(${hue}, ${sat}%, ${lit}%, ${alpha})`;
  }

  private glowColor() {
    const hue = (this.hue + this.t * 8) % 360;
    return `hsla(${hue}, 70%, 55%, 0.04)`;
  }

  private tick = () => {
    const dt = 0.025;
    const p0 = this.point(this.t);
    const p1 = this.point(this.t + dt);
    this.t += dt;

    if (this.t > Math.PI * 2 * 12) {
      this.newPattern();
    }

    // Glow layer — thick faint strokes behind main
    for (let i = 0; i < 8; i++) {
      const ox = (Math.random() - 0.5) * 2;
      const oy = (Math.random() - 0.5) * 2;
      this.ctx.beginPath();
      this.ctx.moveTo(p0.x + ox, p0.y + oy);
      this.ctx.lineTo(p1.x + ox, p1.y + oy);
      this.ctx.strokeStyle = this.glowColor();
      this.ctx.lineWidth = 3 + Math.random() * 2;
      this.ctx.stroke();
    }

    // Main strokes — colorful, sharper
    for (let i = 0; i < 12; i++) {
      const ox = (Math.random() - 0.5) * 1.5;
      const oy = (Math.random() - 0.5) * 1.5;
      const jx = (Math.random() - 0.5) * 0.4;
      const jy = (Math.random() - 0.5) * 0.4;
      this.ctx.beginPath();
      this.ctx.moveTo(p0.x + ox, p0.y + oy);
      this.ctx.lineTo(p1.x + ox + jx, p1.y + oy + jy);
      this.ctx.strokeStyle = this.strokeColor();
      this.ctx.lineWidth = 0.3 + Math.random() * 1.2;
      this.ctx.stroke();
    }

    this.animId = requestAnimationFrame(this.tick);
  };

  destroy() {
    cancelAnimationFrame(this.animId);
  }
}
