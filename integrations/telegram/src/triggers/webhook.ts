import { timingSafeEqual } from 'node:crypto';
import { skipWebhook } from 'slates';
import { z } from 'zod';
import {
  type TelegramEvent,
  type TelegramReactionType,
  type TelegramUpdateKind,
  telegramAllowedUpdates,
  telegramChatMemberUpdatedSchema,
  telegramMessageReactionSchema,
  telegramMessageSchema,
  telegramUpdateEnvelopeSchema
} from './event-schemas';

export let TELEGRAM_SECRET_HEADER = 'x-telegram-bot-api-secret-token';

// https://core.telegram.org/bots/api#setwebhook
export let telegramSecretTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{1,256}$/);

export let telegramTargetSchema = z.object({
  botId: z.string().regex(/^\d+$/),
  botUsername: z.string().optional()
});

export let telegramRegistrationSchema = telegramTargetSchema.extend({
  webhookUrl: z.string().url(),
  secretToken: telegramSecretTokenSchema
});

export let telegramTargetIdentifier = (target: { botId: string }) =>
  `telegram-bot:${target.botId}`;

let secretMatches = (provided: string, expected: string) => {
  let a = Buffer.from(provided);
  let b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

let MEMBER_STATUSES = new Set(['creator', 'administrator', 'member']);

let isMember = (member: { status: string; is_member?: boolean }) =>
  MEMBER_STATUSES.has(member.status) ||
  (member.status === 'restricted' && member.is_member === true);

let reactionKey = (reaction: TelegramReactionType) =>
  reaction.type === 'emoji'
    ? `emoji:${reaction.emoji}`
    : reaction.type === 'custom_emoji'
      ? `custom:${reaction.custom_emoji_id}`
      : 'paid';

// Excludes paid reactions.
export let telegramReactionDelta = (
  oldReactions: TelegramReactionType[],
  newReactions: TelegramReactionType[]
) => {
  let oldKeys = new Set(oldReactions.map(reactionKey));
  let newKeys = new Set(newReactions.map(reactionKey));
  let added = newReactions.filter(
    reaction => reaction.type !== 'paid' && !oldKeys.has(reactionKey(reaction))
  );
  let removed = oldReactions.filter(
    reaction => reaction.type !== 'paid' && !newKeys.has(reactionKey(reaction))
  );
  return { added, removed };
};

let jsonUtf8 = new TextDecoder('utf-8', { fatal: true });

export let processTelegramWebhook = async (input: {
  request: Request;
  webhookRegistrationPayload: unknown;
}) => {
  let registration = telegramRegistrationSchema.safeParse(input.webhookRegistrationPayload);
  if (!registration.success) {
    return skipWebhook('telegram_webhook_registration_invalid', { status: 500, body: '' });
  }
  if (input.request.method !== 'POST') {
    return skipWebhook('telegram_webhook_method_invalid', {
      status: 405,
      body: '',
      headers: { Allow: 'POST' }
    });
  }

  // Telegram sends the registration's secret_token in this header on every request.
  let secret = input.request.headers.get(TELEGRAM_SECRET_HEADER);
  if (!secret) {
    return skipWebhook('telegram_webhook_secret_missing', { status: 401, body: '' });
  }
  if (!secretMatches(secret, registration.data.secretToken)) {
    return skipWebhook('telegram_webhook_secret_invalid', { status: 401, body: '' });
  }

  // Telegram retries non-2xx responses, so unusable updates are acked and skipped.
  let ok = { status: 200, body: '' };

  let body: unknown;
  try {
    body = JSON.parse(jsonUtf8.decode(await input.request.arrayBuffer()));
  } catch {
    return skipWebhook('telegram_webhook_json_invalid', ok);
  }

  let envelope = telegramUpdateEnvelopeSchema.safeParse(body);
  if (!envelope.success) {
    return skipWebhook('telegram_webhook_envelope_invalid', ok);
  }
  let update = envelope.data as Record<string, unknown> & { update_id: number };

  let kind = telegramAllowedUpdates.find(key => update[key] !== undefined) as
    | TelegramUpdateKind
    | undefined;
  if (!kind) {
    return skipWebhook('telegram_webhook_update_unsupported', ok);
  }

  let bot = { id: registration.data.botId, username: registration.data.botUsername };
  let base = { bot, kind, updateId: update.update_id, update };
  let key = `${bot.id}:${update.update_id}`;

  if (kind === 'message_reaction') {
    let reaction = telegramMessageReactionSchema.safeParse(update.message_reaction);
    if (!reaction.success) {
      return skipWebhook('telegram_webhook_envelope_invalid', ok);
    }
    let delta = telegramReactionDelta(reaction.data.old_reaction, reaction.data.new_reaction);
    let events = [
      ...delta.added.map(type => ({ change: 'added' as const, type })),
      ...delta.removed.map(type => ({ change: 'removed' as const, type }))
    ].map(change => ({
      payload: { ...base, reaction: change } satisfies TelegramEvent,
      // Automatic targets route through subscriptions; matchers are unused here.
      matchers: [],
      idempotencyKey: `${key}:${change.change}:${reactionKey(change.type)}`
    }));
    if (!events.length) {
      return skipWebhook('telegram_webhook_reaction_unchanged', ok);
    }
    return { events, response: ok };
  }

  if (kind === 'chat_member' || kind === 'my_chat_member') {
    let member = telegramChatMemberUpdatedSchema.safeParse(update[kind]);
    if (!member.success) {
      return skipWebhook('telegram_webhook_envelope_invalid', ok);
    }
    // my_chat_member always describes this bot; anything else is not our delivery.
    if (kind === 'my_chat_member' && String(member.data.new_chat_member.user.id) !== bot.id) {
      return skipWebhook('telegram_webhook_target_mismatch', ok);
    }
    let was = isMember(member.data.old_chat_member);
    let now = isMember(member.data.new_chat_member);
    if (was === now) {
      return skipWebhook('telegram_webhook_member_unchanged', ok);
    }
    return {
      events: [
        {
          payload: { ...base, membership: now ? 'joined' : 'left' } satisfies TelegramEvent,
          matchers: [],
          idempotencyKey: key
        }
      ],
      response: ok
    };
  }

  let message = telegramMessageSchema.safeParse(update[kind]);
  if (!message.success) {
    return skipWebhook('telegram_webhook_envelope_invalid', ok);
  }
  return {
    events: [{ payload: base satisfies TelegramEvent, matchers: [], idempotencyKey: key }],
    response: ok
  };
};
