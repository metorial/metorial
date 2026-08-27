import {
  ChatError,
  chatError,
  chatErrorProviderCode,
  getChatErrorInfo,
  isChatErrorRetryable
} from '@slates/adapter-chat';
import { SlateError } from 'slates';
import { describe, expect, it } from 'vitest';
import { slackApiError } from '../../lib/errors';
import { mapSlackChatError, withSlackChatErrors } from './errors';

/** What SlackClient throws for Slack's HTTP-200 `{ ok: false, error }` shape. */
let apiError = (code: string, details: Record<string, unknown> = {}) =>
  slackApiError('chat.postMessage', code, details as { needed?: string });

describe('mapSlackChatError', () => {
  it('maps a Slack error string to its chat code and keeps the raw code', () => {
    let error = mapSlackChatError(apiError('channel_not_found'), {
      action: 'metorial_chat$message.send',
      channelId: 'C123'
    });

    expect(error.chat.code).toBe('chat.channel.not_found');
    expect(error.chat.target).toEqual({ type: 'channel', id: 'C123' });
    expect(error.chat.action).toBe('metorial_chat$message.send');
    expect(error.chat.provider?.code).toBe('channel_not_found');
  });

  it('inherits the slates classification the ServiceError already carried', () => {
    // slackApiError builds a 400 bad_request, which maps to request.bad.
    let error = mapSlackChatError(apiError('not_in_channel'), { channelId: 'C1' });

    expect(error.chat.code).toBe('chat.access.not_a_member');
    expect(error.code).toBe('request.bad');
  });

  it('carries the scopes Slack named on missing_scope', () => {
    let error = mapSlackChatError(
      apiError('missing_scope', {
        needed: 'channels:read,groups:read',
        provided: 'chat:write'
      })
    );

    expect(error.chat.code).toBe('chat.auth.missing_scope');
    expect(error.chat.scopes).toEqual(['channels:read', 'groups:read']);
  });

  it('falls back to the scopes the call site declared', () => {
    let error = mapSlackChatError(apiError('missing_scope'), {
      scopes: ['reactions:write']
    });

    expect(error.chat.scopes).toEqual(['reactions:write']);
  });

  it('classifies transport failures from the slates code', () => {
    let rateLimited = new SlateError({
      code: 'upstream.rate_limited',
      message: 'Too many requests',
      status: 429
    });

    let error = mapSlackChatError(rateLimited);

    expect(error.chat.code).toBe('chat.rate_limit.exceeded');
    expect(error.code).toBe('upstream.rate_limited');
    expect(error.status).toBe(429);
    expect(isChatErrorRetryable(error)).toBe(true);
  });

  it('reads the Slack code out of a real HTTP error response', () => {
    let httpError = new SlateError({
      code: 'resource.not_found',
      message: 'Not Found',
      status: 404,
      upstream: { status: 404, code: 'channel_not_found' }
    });

    expect(mapSlackChatError(httpError, { channelId: 'C1' }).chat.code).toBe(
      'chat.channel.not_found'
    );
  });

  it('resolves endpoint-specific codes through the ambiguous map', () => {
    let notFound = apiError('not_found');

    expect(mapSlackChatError(notFound).chat.code).toBe('chat.provider.error');
    expect(
      mapSlackChatError(notFound, {
        ambiguous: { not_found: 'chat.interaction.modal_not_found' }
      }).chat.code
    ).toBe('chat.interaction.modal_not_found');
  });

  it('falls back to chat.provider.error for codes it does not know', () => {
    let error = mapSlackChatError(apiError('some_new_slack_code'));

    expect(error.chat.code).toBe('chat.provider.error');
    expect(error.chat.provider?.code).toBe('some_new_slack_code');
  });

  it('leaves an existing chat error untouched', () => {
    // This catch-all must not relabel a specific classification made deeper in
    // the call as a generic provider error.
    let specific = chatError('chat.content.empty', { action: 'metorial_chat$message.send' });

    expect(mapSlackChatError(specific)).toBe(specific);
    expect(mapSlackChatError(specific, { channelId: 'C1' }).chat.code).toBe(
      'chat.content.empty'
    );
  });
});

describe('withSlackChatErrors', () => {
  it('passes a success through untouched', async () => {
    await expect(withSlackChatErrors({}, async () => 'ok')).resolves.toBe('ok');
  });

  it('converts a Slack failure into a chat error', async () => {
    let promise = withSlackChatErrors({ channelId: 'C1' }, async () => {
      throw apiError('is_archived');
    });

    await expect(promise).rejects.toSatisfy(error =>
      ChatError.isCode(error, 'chat.access.channel_archived')
    );
  });

  it('keeps the raw provider code reachable after conversion', async () => {
    let error = await withSlackChatErrors({}, async () => {
      throw apiError('already_reacted');
    }).catch(caught => caught);

    expect(getChatErrorInfo(error)?.code).toBe('chat.reaction.already_exists');
    expect(chatErrorProviderCode(error)).toBe('already_reacted');
  });
});
