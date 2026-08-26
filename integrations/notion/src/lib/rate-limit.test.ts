import { describe, expect, it, vi } from 'vitest';
import { getNotionRetryAfterMs, requestWithNotionRateLimitRetry } from './rate-limit';

describe('getNotionRetryAfterMs', () => {
  it('honors Retry-After seconds and HTTP dates', () => {
    expect(getNotionRetryAfterMs({ 'retry-after': '2' }, 0)).toBe(2_000);
    expect(
      getNotionRetryAfterMs(
        { 'Retry-After': 'Wed, 26 Aug 2026 15:00:03 GMT' },
        0,
        Date.parse('Wed, 26 Aug 2026 15:00:00 GMT')
      )
    ).toBe(3_000);
  });

  it('uses exponential fallback delays', () => {
    expect(getNotionRetryAfterMs({}, 0)).toBe(250);
    expect(getNotionRetryAfterMs({}, 10)).toBe(256_000);
  });

  it('preserves provider delays that exceed the local wait budget', () => {
    expect(getNotionRetryAfterMs({ 'retry-after': '120' }, 0)).toBe(120_000);
  });
});

describe('requestWithNotionRateLimitRetry', () => {
  it('waits for Retry-After before retrying a rate-limited request', async () => {
    let request = vi
      .fn()
      .mockResolvedValueOnce({ status: 429, headers: { 'retry-after': '2' }, data: null })
      .mockResolvedValueOnce({ status: 200, data: { results: [] } });
    let wait = vi.fn(async () => undefined);

    await expect(requestWithNotionRateLimitRetry(request, wait)).resolves.toEqual({
      results: []
    });
    expect(request).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(2_000);
  });

  it('returns a structured 429 after the bounded retry budget is exhausted', async () => {
    let request = vi.fn(async () => ({
      status: 429,
      headers: { 'retry-after': '1' },
      data: { code: 'rate_limited' }
    }));
    let wait = vi.fn(async () => undefined);

    await expect(requestWithNotionRateLimitRetry(request, wait)).rejects.toMatchObject({
      data: {
        status: 429,
        code: 'too_many_requests',
        reason: 'notion_rate_limited',
        upstreamStatus: 429,
        upstreamCode: 'rate_limited',
        retryAfter: '1'
      }
    });
    expect(request).toHaveBeenCalledTimes(4);
    expect(wait).toHaveBeenCalledTimes(3);
  });

  it('returns a structured 429 instead of retrying before a long Retry-After delay', async () => {
    let request = vi.fn(async () => ({
      status: 429,
      headers: { 'retry-after': '120' },
      data: { code: 'rate_limited' }
    }));
    let wait = vi.fn(async () => undefined);

    await expect(requestWithNotionRateLimitRetry(request, wait)).rejects.toMatchObject({
      data: {
        status: 429,
        reason: 'notion_rate_limited',
        retryAfter: '120'
      }
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });
});
