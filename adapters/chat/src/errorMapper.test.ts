import { badRequestError, ServiceError } from '@lowerdeck/error';
import { SlateError } from '@slates/provider';
import { describe, expect, it } from 'vitest';
import {
  type ChatErrorCode,
  ChatErrors,
  chatErrorCodeForStatus,
  createChatErrorMapper,
  parseRetryAfterMs,
  readChatErrorUpstream,
  SLATE_CHAT_ERROR_CODES
} from './errors';

interface Context {
  action?: string;
  channelId?: string;
  messageId?: string;
  ambiguous?: Record<string, ChatErrorCode>;
}

let TABLE: Record<string, ChatErrorCode> = {
  missing: 'chat.channel.not_found',
  slow: 'chat.rate_limit.exceeded',
  scope: 'chat.auth.missing_scope'
};

let mapper = createChatErrorMapper<Context>({
  targetFields: { channel: 'channelId', message: 'messageId', reaction: 'messageId' },
  extraCodes: { 'upstream.invalid_request': 'chat.input.invalid' },
  classify: (_error, context, upstream) => {
    let code = upstream.code
      ? (context.ambiguous?.[upstream.code] ?? TABLE[upstream.code])
      : undefined;
    return {
      code: code ?? chatErrorCodeForStatus(upstream.status),
      provider: upstream.code ? { code: upstream.code } : undefined,
      scopes: code === 'chat.auth.missing_scope' ? ['chat:write'] : undefined
    };
  }
});

let slateError = (input: {
  code?: string;
  upstreamCode?: string | number;
  status?: number;
  retryAfterMs?: number;
}) =>
  new SlateError({
    code: input.code ?? 'upstream.error',
    message: 'upstream failed',
    status: input.status,
    upstream: { status: input.status, code: input.upstreamCode as string | undefined },
    baggage: { retryAfterMs: input.retryAfterMs }
  });

describe('readChatErrorUpstream', () => {
  it('reads slate and service errors', () => {
    expect(
      readChatErrorUpstream(slateError({ upstreamCode: 10008, status: 404, retryAfterMs: 5 }))
    ).toEqual({ code: '10008', status: 404, retryAfterMs: 5, message: 'upstream failed' });

    let service = new ServiceError(badRequestError({ message: 'service failed' }));
    service.data.upstreamCode = 'nope';
    service.data.upstreamStatus = '503';
    expect(readChatErrorUpstream(service)).toEqual({
      code: 'nope',
      status: 503,
      message: expect.stringContaining('service failed')
    });

    expect(readChatErrorUpstream(new Error('x'))).toEqual({});
    expect(readChatErrorUpstream('x')).toEqual({});
  });
});

describe('createChatErrorMapper', () => {
  it('returns existing chat errors untouched', () => {
    let error = ChatErrors.messageNotFound({ messageId: 'M' });
    expect(mapper.map(error, { action: 'a' })).toBe(error);
  });

  it('classifies provider codes and resolves targets', () => {
    let error = mapper.map(slateError({ upstreamCode: 'missing' }), {
      action: 'metorial_chat$message.send',
      channelId: 'C1'
    });
    expect(error.chat).toMatchObject({
      code: 'chat.channel.not_found',
      action: 'metorial_chat$message.send',
      target: { type: 'channel', id: 'C1' },
      provider: { code: 'missing' }
    });
  });

  it('applies ambiguous overrides and scopes', () => {
    let ambiguous = mapper.map(slateError({ upstreamCode: 'missing' }), {
      messageId: 'M1',
      ambiguous: { missing: 'chat.message.not_found' }
    });
    expect(ambiguous.chat.code).toBe('chat.message.not_found');
    expect(ambiguous.chat.target).toEqual({ type: 'message', id: 'M1' });

    expect(mapper.map(slateError({ upstreamCode: 'scope' })).chat.scopes).toEqual([
      'chat:write'
    ]);
  });

  it('falls back to slates codes, extra codes, then provider.error', () => {
    let fallback = createChatErrorMapper<Context>({
      targetFields: {},
      extraCodes: { 'upstream.invalid_request': 'chat.input.invalid' },
      classify: () => ({})
    });
    expect(fallback.map(slateError({ code: 'upstream.timeout' })).chat.code).toBe(
      'chat.provider.timeout'
    );
    expect(fallback.map(slateError({ code: 'upstream.invalid_request' })).chat.code).toBe(
      'chat.input.invalid'
    );
    expect(fallback.map(slateError({ code: 'constructor' })).chat.code).toBe(
      'chat.provider.error'
    );
    expect(fallback.map(new Error('boom')).chat.code).toBe('chat.provider.error');
    expect(SLATE_CHAT_ERROR_CODES['auth.required']).toBe('chat.auth.invalid');
  });

  it('sets the retry delay only for rate limits', () => {
    let limited = mapper.map(slateError({ status: 429, retryAfterMs: 1500 }));
    expect(limited.chat.code).toBe('chat.rate_limit.exceeded');
    expect(limited.chat.retryAfterMs).toBe(1500);

    let unavailable = mapper.map(slateError({ status: 503, retryAfterMs: 1500 }));
    expect(unavailable.chat.code).toBe('chat.provider.unavailable');
    expect(unavailable.chat.retryAfterMs).toBeUndefined();
  });

  it('prefers a classified retry delay and message', () => {
    let custom = createChatErrorMapper<Context>({
      targetFields: {},
      classify: () => ({
        code: 'chat.rate_limit.exceeded',
        retryAfterMs: 3000,
        message: 'Slow down.'
      })
    });
    let error = custom.map(slateError({ retryAfterMs: 1 }));
    expect(error.chat.retryAfterMs).toBe(3000);
    expect(error.message).toBe('Slow down.');
  });

  it('wraps failures thrown inside withErrors', async () => {
    await expect(
      mapper.withErrors({ channelId: 'C' }, async () => {
        throw slateError({ upstreamCode: 'missing' });
      })
    ).rejects.toMatchObject({ chat: { code: 'chat.channel.not_found' } });
    await expect(mapper.withErrors({}, async () => 'ok')).resolves.toBe('ok');
  });
});

describe('foreign SlateError copies', () => {
  it('classifies a SlateError-shaped error from another module instance', () => {
    let foreign = Object.assign(new Error('upstream failed'), {
      name: 'SlateError',
      data: {
        code: 'upstream.timeout',
        message: 'upstream failed',
        upstream: { code: 'slow', status: 429 },
        baggage: { retryAfterMs: 250 }
      }
    });
    expect(readChatErrorUpstream(foreign)).toEqual({
      code: 'slow',
      status: 429,
      retryAfterMs: 250,
      message: 'upstream failed'
    });
    let fallback = createChatErrorMapper<Context>({ targetFields: {}, classify: () => ({}) });
    expect(fallback.map(foreign).chat.code).toBe('chat.provider.timeout');
  });
});

describe('chatErrorCodeForStatus', () => {
  it('maps the common statuses', () => {
    expect(chatErrorCodeForStatus(401)).toBe('chat.auth.invalid');
    expect(chatErrorCodeForStatus(403)).toBe('chat.access.forbidden');
    expect(chatErrorCodeForStatus(404)).toBeUndefined();
    expect(chatErrorCodeForStatus(404, 'chat.message.not_found')).toBe(
      'chat.message.not_found'
    );
    expect(chatErrorCodeForStatus(429)).toBe('chat.rate_limit.exceeded');
    expect(chatErrorCodeForStatus(502)).toBe('chat.provider.unavailable');
    expect(chatErrorCodeForStatus(400)).toBeUndefined();
    expect(chatErrorCodeForStatus(undefined)).toBeUndefined();
  });
});

describe('parseRetryAfterMs', () => {
  it('parses seconds and dates', () => {
    let now = Date.parse('2026-01-01T00:00:00Z');
    expect(parseRetryAfterMs('1.5', now)).toBe(1500);
    expect(parseRetryAfterMs('2026-01-01T00:00:10Z', now)).toBe(10_000);
    expect(parseRetryAfterMs('Thu, 01 Jan 2026 00:00:05 GMT', now)).toBe(5000);
    expect(parseRetryAfterMs('2025-01-01T00:00:00Z', now)).toBe(0);
    expect(parseRetryAfterMs('soon', now)).toBeUndefined();
    expect(parseRetryAfterMs('', now)).toBeUndefined();
    expect(parseRetryAfterMs(undefined, now)).toBeUndefined();
  });
});
