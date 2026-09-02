import { ServiceError } from '@lowerdeck/error';
import { createApiServiceError } from 'slates';
import { describe, expect, it } from 'vitest';
import { destatisSecureApiError } from './errors';

describe('destatisSecureApiError', () => {
  it('redacts the token from upstream status and code metadata', () => {
    let token = 'metadata-token-that-must-not-leak';
    let upstream = createApiServiceError(`Request failed for ${token}`, {
      upstreamStatus: `status-${token}`,
      upstreamCode: `code-${token}`
    });

    let failure = destatisSecureApiError(upstream, token, 'test request');

    expect(failure).toBeInstanceOf(ServiceError);
    expect(failure.data.message).not.toContain(token);
    expect(failure.data.upstreamStatus).not.toContain(token);
    expect(failure.data.upstreamCode).not.toContain(token);
    expect(String(failure)).not.toContain(token);
    expect(JSON.stringify(failure)).not.toContain(token);
  });
});
