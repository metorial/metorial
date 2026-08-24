import { describe, expect, it } from 'vitest';
import { newRelicGraphqlErrors } from './errors';

describe('New Relic error mapping', () => {
  it('includes structured NerdGraph validation details', () => {
    const error = newRelicGraphqlErrors('NerdGraph request', [
      {
        message: 'Validation Error',
        extensions: {
          errorCode: 'BAD_USER_INPUT',
          errorClass: 'VALIDATION',
          argumentPath: ['condition', 'signal', 'aggregationWindow']
        }
      }
    ]);

    expect(error.data.message).toContain('Validation Error');
    expect(error.data.message).toContain('BAD_USER_INPUT');
    expect(error.data.message).toContain('VALIDATION');
    expect(error.data.message).toContain('aggregationWindow');
  });
});
