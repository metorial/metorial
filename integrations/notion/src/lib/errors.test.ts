import { SlateError } from 'slates';
import { describe, expect, it } from 'vitest';
import { notionApiError } from './errors';

describe('notionApiError', () => {
  it('preserves structured Slate errors from the shared HTTP client', () => {
    let error = new SlateError({
      code: 'request.bad',
      message: 'body failed validation',
      kind: 'request',
      retryable: false,
      status: 400,
      provider: {
        key: 'notion'
      },
      upstream: {
        status: 400,
        code: 'validation_error',
        type: 'validation_error',
        method: 'GET',
        url: 'https://api.notion.com/v1/pages/example-page-id'
      },
      baggage: {
        response: {
          object: 'error',
          status: 400,
          code: 'validation_error',
          message: 'body failed validation'
        }
      }
    });

    let mapped = notionApiError(error, 'retrieve page');

    expect(mapped).toBe(error);
    expect(mapped.toResponse()).toMatchObject({
      code: 'request.bad',
      status: 400,
      retryable: false,
      upstream: {
        status: 400,
        code: 'validation_error',
        method: 'GET'
      },
      baggage: {
        response: {
          code: 'validation_error',
          message: 'body failed validation'
        }
      }
    });
  });
});
