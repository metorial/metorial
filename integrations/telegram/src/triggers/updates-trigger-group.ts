import { randomBytes } from 'node:crypto';
import { createApiServiceError, triggerGroup } from 'slates';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';
import { telegramAllowedUpdates, telegramEventSchema } from './event-schemas';
import {
  processTelegramWebhook,
  telegramRegistrationSchema,
  telegramTargetIdentifier,
  telegramTargetSchema
} from './webhook';

let resolveTarget = async (client: TelegramClient) => {
  let me = await client.getMe();
  let target = telegramTargetSchema.safeParse({
    botId: me?.id === undefined ? undefined : String(me.id),
    botUsername: me?.username
  });
  if (!target.success) {
    throw createApiServiceError('Telegram did not return a valid bot identity.');
  }
  return target.data;
};

let sameUpdates = (actual: string[] | undefined) => {
  if (!actual) return false;
  let expected = new Set<string>(telegramAllowedUpdates);
  return actual.length === expected.size && actual.every(update => expected.has(update));
};

/**
 * One webhook per bot: Telegram keeps a single webhook URL per bot token, so the bot
 * is the only target and registration replaces any webhook set elsewhere.
 * https://core.telegram.org/bots/api#setwebhook
 */
export let telegramUpdatesTriggerGroup = triggerGroup(spec, {
  key: 'updates',
  name: 'Bot Updates',
  description:
    'Messages, edits, reactions, and membership changes in chats the Telegram bot belongs to.',
  eventSchema: telegramEventSchema
})
  .webhook({
    autoRegistration: {
      webhookTargetList: async ctx => {
        if (ctx.input.pageToken !== null && ctx.input.pageToken !== undefined) {
          throw createApiServiceError(
            'Telegram bot targets do not support pagination tokens.'
          );
        }
        let target = await resolveTarget(new TelegramClient(ctx.auth.token));
        return {
          targets: [
            {
              webhookTargetIdentifier: telegramTargetIdentifier(target),
              name: target.botUsername ? `@${target.botUsername}` : `Bot ${target.botId}`,
              metadata: { ...target },
              webhookTargetPayload: target,
              // Connections sharing a bot token must share its single webhook.
              targetOwnership: 'multi_user' as const
            }
          ],
          nextPageToken: null
        };
      },

      webhookRegister: async ctx => {
        let client = new TelegramClient(ctx.auth.token);
        let target = await resolveTarget(client);
        let supplied = telegramTargetSchema.safeParse(ctx.input.webhookTargetPayload);
        if (
          !supplied.success ||
          supplied.data.botId !== target.botId ||
          ctx.input.webhookTargetIdentifier !== telegramTargetIdentifier(target)
        ) {
          throw createApiServiceError(
            'The connected Telegram bot has changed. Select the event target again.'
          );
        }

        let webhookUrl = new URL(ctx.input.webhookUrl);
        if (webhookUrl.protocol !== 'https:') {
          throw createApiServiceError('Telegram webhooks require an HTTPS receive URL.');
        }

        let previous = await client.getWebhookInfo();
        if (previous?.url && previous.url !== ctx.input.webhookUrl) {
          ctx.warn(
            'telegram_webhook_replaced: the bot already had a webhook, which Telegram replaces with this registration.'
          );
        }

        let secretToken = randomBytes(32).toString('hex');
        await client.setWebhook({
          url: ctx.input.webhookUrl,
          secretToken,
          allowedUpdates: [...telegramAllowedUpdates]
        });

        let info = await client.getWebhookInfo();
        if (info?.url !== ctx.input.webhookUrl || !sameUpdates(info.allowed_updates)) {
          if (info?.url === ctx.input.webhookUrl) await client.deleteWebhook();
          throw createApiServiceError(
            'Telegram did not apply the requested webhook URL and update types.'
          );
        }

        let payload = telegramRegistrationSchema.parse({
          ...target,
          webhookUrl: ctx.input.webhookUrl,
          secretToken
        });
        return {
          webhookRegistrationIdentifier: telegramTargetIdentifier(target),
          webhookRegistrationPayload: payload
        };
      },

      webhookUnregister: async ctx => {
        let saved = telegramRegistrationSchema.safeParse(ctx.input.webhookRegistrationPayload);
        if (!saved.success) {
          throw createApiServiceError('The saved Telegram webhook registration is invalid.');
        }
        let client = new TelegramClient(ctx.auth.token);
        let target = await resolveTarget(client);
        if (target.botId !== saved.data.botId) {
          throw createApiServiceError(
            'The current Telegram credentials belong to a different bot than the webhook.'
          );
        }

        let info = await client.getWebhookInfo();
        // A different or empty URL proves this registration is no longer active;
        // never remove a webhook that another registration owns.
        if (info?.url !== saved.data.webhookUrl) return;

        await client.deleteWebhook();
        let after = await client.getWebhookInfo();
        if (after?.url === saved.data.webhookUrl) {
          throw createApiServiceError('Telegram did not remove the webhook.');
        }
      }
    },
    process: ctx => processTelegramWebhook(ctx.input)
  })
  // Automatic targets route through subscriptions; the SDK still requires this handler.
  .routingMatchers(async () => [])
  .build();
