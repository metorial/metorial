import { beforeEach, describe, expect, it, vi } from 'vitest';

let setWebhook = vi.fn();
let deleteWebhook = vi.fn();

vi.mock('./client', () => ({
  TelegramClient: class {
    setWebhook = setWebhook;
    deleteWebhook = deleteWebhook;
  }
}));

import {
  generateSecretToken,
  registerTelegramWebhook,
  telegramWebhookHttp,
  unregisterTelegramWebhook,
  verifySecretToken
} from './webhook-utils';

beforeEach(() => {
  setWebhook.mockReset();
  deleteWebhook.mockReset();
});

describe('Telegram singleton webhook contract', () => {
  it('generates independent CSPRNG tokens in Telegram permitted alphabet', () => {
    let tokens = Array.from({ length: 32 }, generateSecretToken);
    expect(new Set(tokens)).toHaveLength(tokens.length);
    expect(tokens.every(token => token.length === 64 && /^[A-Za-z0-9_-]+$/.test(token))).toBe(
      true
    );
  });

  it('compares the active token exactly and rejects malformed input', () => {
    let request = (value?: string) =>
      new Request('https://example.com/telegram', {
        headers: value ? { 'x-telegram-bot-api-secret-token': value } : {}
      });
    expect(verifySecretToken(request('active-token'), 'active-token')).toBe(true);
    expect(verifySecretToken(request('retiring-token'), 'active-token')).toBe(false);
    expect(verifySecretToken(request('wrong-token'), 'active-token')).toBe(false);
    expect(verifySecretToken(request('bad token'), 'bad token')).toBe(false);
    expect(verifySecretToken(request(), 'active-token')).toBe(false);
  });

  it('declares named-secret verification and update-id replay protection', () => {
    expect(telegramWebhookHttp.ingress.verification).toMatchObject({
      mechanism: 'hub',
      allowedSecretRefs: [
        {
          source: 'registration',
          name: 'telegram_secret_token',
          registrationKey: 'secretToken'
        }
      ],
      rules: [
        {
          when: { registrationStatuses: ['registered'] },
          verify: { type: 'static_token', secretName: 'telegram_secret_token' },
          replay: {
            deduplicate: { source: 'json_pointer', pointer: '/update_id' }
          }
        }
      ]
    });
  });

  it('programs one receiver URL with the exact union while preserving its bound token', async () => {
    let result = await registerTelegramWebhook(
      {
        auth: { token: 'bot-token' },
        input: {
          webhookBaseUrl: 'https://example.com/receivers/receiver-1',
          registrationDetails: {
            secretToken: 'stable-token',
            allowedUpdates: ['poll', 'message', 'poll']
          }
        }
      },
      ['callback_query']
    );
    expect(setWebhook).toHaveBeenCalledWith({
      url: 'https://example.com/receivers/receiver-1',
      secretToken: 'stable-token',
      allowedUpdates: ['message', 'poll']
    });
    expect(result.registrationDetails).toEqual({
      secretToken: 'stable-token',
      allowedUpdates: ['message', 'poll']
    });
    expect(result.capturedSecrets).toEqual({
      telegram_secret_token: 'stable-token'
    });
  });

  it('deletes the upstream webhook only when the runtime invokes final unregister', async () => {
    await unregisterTelegramWebhook({ auth: { token: 'bot-token' } });
    expect(deleteWebhook).toHaveBeenCalledOnce();
  });
});
