import { SlateError } from './base';

export class SlateDeclarationError extends SlateError {
  constructor(message: string, input: Partial<SlateError['data']> = {}) {
    super({
      code: 'declaration.invalid_definition',
      kind: 'declaration',
      message,
      ...input
    });
    this.name = 'SlateError.DeclarationError';
  }

  static override is(error: unknown): error is SlateDeclarationError {
    return error instanceof SlateDeclarationError;
  }
}
