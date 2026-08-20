import { createLocalSlateTestClient, handleSlateTriggerWebhook } from '@slates/test';
import { provider } from '../index';

export let handleTelegramUpdate = (triggerId: string, update: Record<string, unknown>) =>
  handleSlateTriggerWebhook({
    client: createLocalSlateTestClient({
      slate: provider,
      state: {
        config: {},
        auth: {
          authenticationMethodId: 'bot_token',
          output: { token: 'bot-token' }
        }
      }
    }),
    triggerId,
    url: 'https://example.com/receivers/telegram',
    body: JSON.stringify(update)
  });
