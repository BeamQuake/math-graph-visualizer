import type { Expr, BinaryOp } from './types';

export class ParseError extends Error {
  constructor(message: string, public readonly position: number) {
    super(`Parse error at position ${position}: ${message}`);
    this.name = 'ParseError';
  }
}

export class Parser {
  private pos = 0;

  constructor(private input: string) {
    this.input = input.trim();
    this.pos = 0;
  }

  parse(): Expr {
    const result = this.parseExpression();
    this.skipWhitespace();
    if (this.pos < this.input.length) {
      throw new ParseError(
        `Unexpected character '${this.input[this.pos]}'`,
        this.pos,
      );
    }
    return result;
  }

  static parse(input: string): Expr {
    return new Parser(input).parse();
  }

  // expression := term (('+' | '-') term)*
  private parseExpression(): Expr {
    let left = this.parseTerm();

    while (this.pos < this.input.length) {
      this.skipWhitespace();
      if (this.pos >= this.input.length) break;

      const ch = this.input[this.pos];
      if (ch !== '+' && ch !== '-') break;
      this.pos++;

      const right = this.parseTerm();
      left = { kind: 'binary', op: ch as BinaryOp, left, right };
    }

    return left;
  }

  // term := unary (('*' | '/') unary)*
  private parseTerm(): Expr {
    let left = this.parseUnary();

    while (this.pos < this.input.length) {
      this.skipWhitespace();
      if (this.pos >= this.input.length) break;

      const ch = this.input[this.pos];
      if (ch !== '*' && ch !== '/') break;

      if (ch === '*') {
        // Check for ** (power)
        if (this.pos + 1 < this.input.length && this.input[this.pos + 1] === '*') {
          break; // Let power handle it
        }
      }

      this.pos++;
      const right = this.parseUnary();
      left = { kind: 'binary', op: ch as BinaryOp, left, right };
    }

    return left;
  }

  // unary := ('+' | '-')* power
  private parseUnary(): Expr {
    this.skipWhitespace();
    if (this.pos >= this.input.length) {
      throw new ParseError('Unexpected end of expression', this.pos);
    }

    const ch = this.input[this.pos];
    if (ch === '+' || ch === '-') {
      this.pos++;
      const arg = this.parseUnary();
      return { kind: 'unary', op: ch as '+' | '-', arg };
    }

    return this.parsePower();
  }

  // power := atom ('^' unary)?
  private parsePower(): Expr {
    let base = this.parseAtom();

    this.skipWhitespace();
    if (this.pos < this.input.length) {
      const ch = this.input[this.pos];
      if (ch === '^' ||
          (ch === '*' && this.pos + 1 < this.input.length && this.input[this.pos + 1] === '*')
      ) {
        this.pos++;
        if (ch === '*') this.pos++; // skip second *
        const exponent = this.parseUnary();
        base = { kind: 'binary', op: '^', left: base, right: exponent };
      }
    }

    return base;
  }

  // atom := number | variable | constant | '(' expression ')' | function '(' args ')'
  private parseAtom(): Expr {
    this.skipWhitespace();

    if (this.pos >= this.input.length) {
      throw new ParseError('Unexpected end of expression', this.pos);
    }

    const ch = this.input[this.pos];

    // Parenthesized expression
    if (ch === '(') {
      this.pos++;
      const expr = this.parseExpression();
      this.skipWhitespace();
      if (this.pos >= this.input.length || this.input[this.pos] !== ')') {
        throw new ParseError('Expected closing parenthesis', this.pos);
      }
      this.pos++;
      return expr;
    }

    // Number
    if (this.isDigit(ch) || ch === '.') {
      return this.parseNumber();
    }

    // Identifier: function call or variable/constant
    if (this.isIdentStart(ch)) {
      const name = this.parseIdentifier();

      // Function call
      this.skipWhitespace();
      if (this.pos < this.input.length && this.input[this.pos] === '(') {
        const args = this.parseArguments();
        return { kind: 'call', name, args };
      }

      // Constants
      if (name === 'pi') return { kind: 'constant', name: 'pi' };
      if (name === 'e' || name === 'E') return { kind: 'constant', name: 'e' };

      // Variable
      return { kind: 'variable', name };
    }

    throw new ParseError(`Unexpected character '${ch}'`, this.pos);
  }

  private parseNumber(): Expr {
    const start = this.pos;
    let hasDot = false;

    while (this.pos < this.input.length) {
      const ch = this.input[this.pos];
      if (this.isDigit(ch)) {
        this.pos++;
      } else if (ch === '.' && !hasDot) {
        hasDot = true;
        this.pos++;
      } else {
        break;
      }
    }

    const value = parseFloat(this.input.slice(start, this.pos));
    if (isNaN(value)) {
      throw new ParseError('Invalid number', start);
    }

    return { kind: 'number', value };
  }

  private parseIdentifier(): string {
    const start = this.pos;
    while (this.pos < this.input.length && this.isIdentPart(this.input[this.pos])) {
      this.pos++;
    }
    return this.input.slice(start, this.pos);
  }

  private parseArguments(): Expr[] {
    const args: Expr[] = [];
    this.pos++; // skip '('
    this.skipWhitespace();

    if (this.pos < this.input.length && this.input[this.pos] !== ')') {
      args.push(this.parseExpression());
      this.skipWhitespace();

      while (this.pos < this.input.length && this.input[this.pos] === ',') {
        this.pos++;
        this.skipWhitespace();
        args.push(this.parseExpression());
        this.skipWhitespace();
      }
    }

    if (this.pos >= this.input.length || this.input[this.pos] !== ')') {
      throw new ParseError('Expected closing parenthesis in function call', this.pos);
    }
    this.pos++; // skip ')'

    return args;
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isIdentStart(ch: string): boolean {
    return /[a-zA-Z_α-ωΑ-Ω]/.test(ch);
  }

  private isIdentPart(ch: string): boolean {
    return /[a-zA-Z0-9_α-ωΑ-Ω]/.test(ch);
  }
}
