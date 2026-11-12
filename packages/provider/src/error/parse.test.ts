import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseWithServiceError } from './parse';

describe('parseWithServiceError', () => {
  let schema = z.object({ id: z.string().min(1), tags: z.array(z.string()).default([]) });

  it('returns the parsed output, including defaults', () => {
    expect(parseWithServiceError(schema, { id: 'a' }, 'Invalid value.')).toEqual({
      id: 'a',
      tags: []
    });
  });

  it('throws a ServiceError with the message and reason', () => {
    let error: unknown;
    try {
      parseWithServiceError(schema, { id: '' }, 'The saved value is invalid.', {
        reason: 'saved_value_invalid'
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ServiceError);
    expect((error as ServiceError<any>).data.message).toBe('The saved value is invalid.');
    expect((error as ServiceError<any>).data.reason).toBe('saved_value_invalid');
  });
});
