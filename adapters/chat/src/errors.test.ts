import { SlateError } from '@slates/provider';
import { describe, expect, it } from 'vitest';
import {
  CHAT_ERROR_BAGGAGE_KEY,
  CHAT_ERROR_MAX_CAUSES,
  ChatError,
  ChatErrors,
  chatError,
  chatErrorCodeChain,
  chatErrorMessage,
  chatErrorProviderCode,
  chatErrorRetryAfterMs,
  getChatErrorInfo,
  isChatErrorCategory,
  isChatErrorCode,
  isChatErrorRetryable,
  parseChatError,
  wrapChatError
} from './errors';

/** What a consumer actually receives: the serialized error, not the instance. */
let overWire = (error: unknown) => JSON.parse(JSON.stringify(error));

describe('chatError', () => {
  it('takes slates fields from the catalog when nothing is wrapped', () => {
    let error = chatError('chat.channel.not_found', { target: 'C123' });

    expect(error.code).toBe('resource.not_found');
    expect(error.kind).toBe('resource');
    expect(error.status).toBe(404);
    expect(error.chat.code).toBe('chat.channel.not_found');
    expect(error.chat.target).toEqual({ type: 'channel', id: 'C123' });
    expect(error.chat.retryable).toBe(false);
  });

  it('does not shadow the slates code with the chat code', () => {
    let error = chatError('chat.rate_limit.exceeded');

    expect(error.code).toBe('upstream.rate_limited');
    expect(error.chat.code).toBe('chat.rate_limit.exceeded');
    expect(error.retryable).toBe(true);
  });

  it('is a SlateError the proto handler will serialize', () => {
    let error = chatError('chat.content.empty');

    expect(error).toBeInstanceOf(SlateError);
    expect(error.name.startsWith('SlateError')).toBe(true);
    expect(typeof error.toResponse).toBe('function');
  });
});

describe('wrapChatError', () => {
  it('keeps the wrapped slates error verbatim and only adds the envelope', () => {
    let upstream = new SlateError({
      code: 'upstream.rate_limited',
      message: 'Slack API error (chat.postMessage): ratelimited',
      status: 429,
      upstream: { status: 429, code: 'ratelimited', url: 'https://slack.com/api' },
      requestTraces: [{ method: 'POST' } as never]
    });

    let error = wrapChatError('chat.rate_limit.exceeded', upstream, { retryAfterMs: 30_000 });

    expect(error.code).toBe('upstream.rate_limited');
    expect(error.status).toBe(429);
    expect(error.retryable).toBe(true);
    expect(error.data.upstream).toMatchObject({ status: 429, code: 'ratelimited' });
    expect(error.data.requestTraces).toHaveLength(1);
    expect(error.chat.code).toBe('chat.rate_limit.exceeded');
    expect(error.chat.retryAfterMs).toBe(30_000);
  });

  it('falls back to the catalog when the wrapped error classifies nothing', () => {
    let error = wrapChatError('chat.channel.not_found', new Error('boom'), {
      target: 'C123'
    });

    // A bare Error normalizes to internal.unexpected, which teaches us nothing —
    // the catalog is strictly more informative there.
    expect(error.code).toBe('resource.not_found');
    expect(error.status).toBe(404);
    expect(error.chat.code).toBe('chat.channel.not_found');
  });

  it('inherits a meaningful classification from a ServiceError-shaped cause', () => {
    let error = wrapChatError('chat.access.forbidden', {
      data: { status: 403, code: 'forbidden', message: 'not allowed' }
    });

    expect(error.code).toBe('permission.denied');
    expect(error.status).toBe(403);
    expect(error.chat.code).toBe('chat.access.forbidden');
  });

  it('handles a nullish cause as a plain raise', () => {
    expect(wrapChatError('chat.content.empty', undefined).chat.code).toBe(
      'chat.content.empty'
    );
    expect(wrapChatError('chat.content.empty', null).chat.code).toBe('chat.content.empty');
  });
});

describe('cause chain', () => {
  it('keeps both classifications when a specific error is wrapped in a general one', () => {
    let inner = chatError('chat.channel.not_found', { target: 'C123' });
    let outer = wrapChatError('chat.event.hydration_failed', inner, {
      action: 'metorial_chat$message.received'
    });

    // The outer wrap is the deliberate classification and stays primary; the
    // specific inner reason is still readable rather than discarded.
    expect(outer.chat.code).toBe('chat.event.hydration_failed');
    expect(chatErrorCodeChain(outer.chat)).toEqual([
      'chat.event.hydration_failed',
      'chat.channel.not_found'
    ]);
    expect(outer.chat.causes?.[0]).toMatchObject({
      code: 'chat.channel.not_found',
      target: { type: 'channel', id: 'C123' }
    });
  });

  it('matches primary codes only unless the chain is opted into', () => {
    let wire = overWire(
      wrapChatError('chat.event.hydration_failed', chatError('chat.channel.not_found'))
    );

    expect(isChatErrorCode(wire, 'chat.event.hydration_failed')).toBe(true);
    expect(isChatErrorCode(wire, 'chat.channel.not_found')).toBe(false);
    expect(isChatErrorCode(wire, 'chat.channel.not_found', { includeCauses: true })).toBe(
      true
    );
  });

  it('stays flat and bounded across repeated wraps', () => {
    let error = chatError('chat.channel.not_found');
    for (let index = 0; index < 8; index++) {
      error = wrapChatError('chat.event.hydration_failed', error);
    }

    expect(error.chat.causes).toHaveLength(CHAT_ERROR_MAX_CAUSES);
    expect(error.chat.causes?.every(cause => !('causes' in cause))).toBe(true);
  });

  it('reports retryability transitively', () => {
    // A rate limit deep inside still means the work is worth retrying, even
    // though the outer classification is not itself retryable.
    let inner = chatError('chat.rate_limit.exceeded', { retryAfterMs: 5_000 });
    let outer = wrapChatError('chat.attachment.upload_failed', inner);
    let terminal = chatError('chat.channel.not_found');

    expect(outer.chat.retryable).toBe(true);
    expect(isChatErrorRetryable(overWire(outer))).toBe(true);
    expect(chatErrorRetryAfterMs(overWire(outer))).toBe(5_000);
    expect(isChatErrorRetryable(overWire(terminal))).toBe(false);
  });

  it('finds the raw provider code through a wrapper', () => {
    let inner = chatError('chat.channel.not_found', {
      provider: { code: 'channel_not_found' }
    });
    let outer = wrapChatError('chat.event.hydration_failed', inner);

    expect(chatErrorProviderCode(overWire(outer))).toBe('channel_not_found');
  });
});

describe('parseChatError', () => {
  it('reads the envelope off the serialized wire shape', () => {
    let wire = overWire(chatError('chat.auth.missing_scope', { scopes: ['channels:read'] }));
    let parsed = parseChatError(wire);

    expect(parsed?.chat?.code).toBe('chat.auth.missing_scope');
    expect(parsed?.chat?.scopes).toEqual(['channels:read']);
    expect(parsed?.slate.code).toBe('permission.denied');
    expect(parsed?.slate.status).toBe(403);
  });

  it('reads through the envelopes the transport wraps errors in', () => {
    let wire = overWire(chatError('chat.channel.not_found'));

    expect(getChatErrorInfo({ error: wire })?.code).toBe('chat.channel.not_found');
    expect(getChatErrorInfo({ type: 'error', data: wire })?.code).toBe(
      'chat.channel.not_found'
    );
    expect(getChatErrorInfo({ result: { output: wire } })).toBeNull();
    expect(getChatErrorInfo({ output: wire })?.code).toBe('chat.channel.not_found');
  });

  it('accepts a live instance as well as the wire shape', () => {
    expect(getChatErrorInfo(chatError('chat.content.empty'))?.code).toBe('chat.content.empty');
  });

  it('returns chat: null for non-chat failures on the same channel', () => {
    // Timeouts and normalized provider errors reach consumers identically.
    let timeout = { code: 'timeout', message: 'exceeded tenant timeout of 30000ms' };
    let parsed = parseChatError(timeout);

    expect(parsed).not.toBeNull();
    expect(parsed?.chat).toBeNull();
    expect(parsed?.slate.code).toBe('timeout');
    expect(isChatErrorRetryable(timeout)).toBe(false);
  });

  it('returns null for values that are not error payloads', () => {
    expect(parseChatError(undefined)).toBeNull();
    expect(parseChatError('nope')).toBeNull();
    expect(parseChatError({ ok: true })).toBeNull();
  });

  it('ignores an envelope carrying an unknown code', () => {
    let wire = overWire(chatError('chat.channel.not_found'));
    wire.baggage[CHAT_ERROR_BAGGAGE_KEY].code = 'chat.invented.code';

    expect(getChatErrorInfo(wire)).toBeNull();
  });

  it('recovers the primary code after fromServiceError demotes the envelope', () => {
    // fromServiceError has no SlateError.is guard, so it re-homes the instance
    // under serviceErrorData and sanitizeForBaggage truncates the buried
    // baggage. Recovery is best effort via the instance's own chat field.
    let demoted = SlateError.fromServiceError(chatError('chat.channel.not_found'));

    expect(getChatErrorInfo(overWire(demoted))?.code).toBe('chat.channel.not_found');
  });

  it('drops malformed chain entries instead of surfacing them', () => {
    let wire = overWire(
      wrapChatError('chat.event.hydration_failed', chatError('chat.channel.not_found'))
    );
    wire.baggage[CHAT_ERROR_BAGGAGE_KEY].causes = [
      { adapter: 'chat', code: '[truncated]' },
      'garbage',
      null
    ];

    let info = getChatErrorInfo(wire);
    expect(info?.code).toBe('chat.event.hydration_failed');
    expect(info?.causes).toBeUndefined();
  });

  it('matches by category', () => {
    let wire = overWire(chatError('chat.auth.expired'));

    expect(isChatErrorCategory(wire, 'auth')).toBe(true);
    expect(isChatErrorCategory(wire, ['target', 'access'])).toBe(false);
  });
});

describe('messages', () => {
  it('keeps upstream detail on the wire and stable text in the catalog', () => {
    let upstream = new SlateError({
      code: 'resource.not_found',
      message: 'Slack API error (conversations.info): channel_not_found'
    });
    let error = wrapChatError('chat.channel.not_found', upstream);

    expect(error.message).toContain('channel_not_found');
    expect(chatErrorMessage('chat.channel.not_found')).toBe(
      'The channel does not exist or the chat app cannot see it.'
    );
  });

  it('prefers an explicit call-site message', () => {
    let error = chatError('chat.input.invalid', {
      message: 'targetUserId is required when ephemeral is true'
    });

    expect(error.message).toBe('targetUserId is required when ephemeral is true');
  });
});

describe('ChatErrors helpers', () => {
  it('turns a bare id into a typed target', () => {
    expect(ChatErrors.channelNotFound({ channelId: 'C1' }).chat.target).toEqual({
      type: 'channel',
      id: 'C1'
    });
    expect(ChatErrors.messageNotFound({ messageId: '1.2' }).chat.target).toEqual({
      type: 'message',
      id: '1.2'
    });
  });

  it('does not leak its id field into the envelope', () => {
    let info = ChatErrors.channelNotFound({ channelId: 'C1' }).chat as unknown as Record<
      string,
      unknown
    >;
    expect(info.channelId).toBeUndefined();
  });

  it('wraps when given a cause and raises plainly otherwise', () => {
    let upstream = new SlateError({ code: 'upstream.rate_limited', message: 'ratelimited' });

    expect(ChatErrors.rateLimited({ cause: upstream, retryAfterMs: 1_000 }).code).toBe(
      'upstream.rate_limited'
    );
    expect(ChatErrors.contentEmpty().code).toBe('input.invalid');
  });

  it('builds structured limits', () => {
    let error = ChatErrors.attachmentTooLarge({ max: 1_024, actual: 2_048, id: 'F1' });

    expect(error.chat.limit).toEqual({ name: 'attachment_bytes', max: 1_024, actual: 2_048 });
    expect(error.chat.target).toEqual({ type: 'attachment', id: 'F1' });
  });
});

describe('ChatError guards', () => {
  it('narrows by instance and by code', () => {
    let error: unknown = chatError('chat.channel.not_found');

    expect(ChatError.is(error)).toBe(true);
    expect(ChatError.is(new Error('x'))).toBe(false);
    expect(ChatError.isCode(error, 'chat.channel.not_found')).toBe(true);
    expect(ChatError.isCode(error, ['chat.auth.invalid', 'chat.channel.not_found'])).toBe(
      true
    );
    expect(ChatError.isCode(error, 'chat.auth.invalid')).toBe(false);
  });
});
