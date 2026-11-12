import {
  googlePubSubRoutingKey,
  isSameGooglePubSubDeliveryConfig,
  parseGooglePubSubDeliveryConfig
} from '@slates/google-pubsub';
import {
  createApiServiceError,
  parseWithServiceError,
  type SlateTriggerGroupWebhookAutoRegistrationParameters
} from 'slates';
import { Client } from '../lib/client';
import {
  historyIdSchema,
  type MailboxRegistration,
  mailboxRegistrationSchema,
  mailboxTargetSchema
} from './event-schemas';

const mailboxTargetId = (accountId: string) => `mailbox:${accountId}`;
const currentMailbox = async (client: Client) => {
  const [user, profile] = await Promise.all([client.getCurrentUser(), client.getProfile()]);
  const target = parseWithServiceError(
    mailboxTargetSchema,
    {
      accountId: user.id,
      mailbox: profile.emailAddress?.toLowerCase()
    },
    'Gmail did not return a valid connected mailbox identity.'
  );
  if (user.email?.toLowerCase() !== target.mailbox) {
    throw createApiServiceError(
      'Email events require the connected Google account’s own mailbox.'
    );
  }
  return {
    ...target,
    historyId: parseWithServiceError(
      historyIdSchema,
      profile.historyId,
      'Gmail did not return a valid mailbox history checkpoint.'
    )
  };
};

export const assertMailbox = async (
  client: Client,
  expected: { accountId: string; mailbox: string }
) => {
  const current = await currentMailbox(client);
  if (current.accountId !== expected.accountId || current.mailbox !== expected.mailbox)
    throw createApiServiceError(
      'The notification belongs to a different mailbox. Reconnect after a primary email address change.'
    );
  return current;
};

const result = (saved: MailboxRegistration) => ({
  webhookRegistrationIdentifier: mailboxTargetId(saved.accountId),
  webhookRegistrationPayload: saved,
  routingKeys: [googlePubSubRoutingKey.gmail(saved.mailbox)],
  expiresAt: saved.expiresAt,
  renewAfter: new Date(
    Math.min(Date.now() + 24 * 60 * 60 * 1000, Date.parse(saved.expiresAt) - 60 * 60 * 1000)
  ).toISOString()
});

const watch = async (client: Client, topicName: string) => {
  const response = await client.watchMailbox(topicName);
  const expiration = Number(response.expiration);
  if (
    !historyIdSchema.safeParse(response.historyId).success ||
    !/^\d+$/.test(response.expiration) ||
    !Number.isSafeInteger(expiration) ||
    !Number.isFinite(new Date(expiration).getTime()) ||
    expiration <= Date.now() + 60 * 60 * 1000
  ) {
    // No watch readback: a malformed response proves nothing, and a rollback stop could end a newer watch.
    throw createApiServiceError(
      'Gmail returned an invalid mailbox watch lease; retry registration with the same destination.'
    );
  }
  return new Date(expiration).toISOString();
};

export const gmailAutoRegistration = {
  webhookTargetList: async ctx => {
    if (ctx.input.pageToken !== null && ctx.input.pageToken !== undefined)
      throw createApiServiceError('The mailbox discovery page token is invalid.');
    const current = await currentMailbox(
      new Client({ token: ctx.auth.token, userId: ctx.config.userId })
    );
    return {
      targets: [
        {
          webhookTargetIdentifier: mailboxTargetId(current.accountId),
          name: current.mailbox,
          description: 'Incoming messages in your connected Gmail mailbox.',
          targetOwnership: 'single_user' as const,
          metadata: { mailbox: current.mailbox },
          webhookTargetPayload: { accountId: current.accountId, mailbox: current.mailbox }
        }
      ],
      nextPageToken: null
    };
  },
  webhookRegister: async ctx => {
    const target = parseWithServiceError(
      mailboxTargetSchema,
      ctx.input.webhookTargetPayload,
      'The saved Gmail mailbox target is invalid.'
    );
    if (ctx.input.webhookTargetIdentifier !== mailboxTargetId(target.accountId))
      throw createApiServiceError('The Gmail mailbox target identity does not match.');
    const delivery = parseGooglePubSubDeliveryConfig(
      ctx.input.deliveryConfig,
      'Gmail notification delivery is not set up for this OAuth application. Complete its Google Pub/Sub delivery setup and try again.'
    );
    const client = new Client({ token: ctx.auth.token, userId: ctx.config.userId });
    const current = await assertMailbox(client, target);
    const activatedAt = new Date(Date.now()).toISOString();
    const expiresAt = await watch(client, delivery.topicName);
    return result({
      ...target,
      delivery,
      initialHistoryId: current.historyId,
      activatedAt,
      expiresAt
    });
  },
  webhookRenew: async ctx => {
    const saved = parseWithServiceError(
      mailboxRegistrationSchema,
      ctx.input.webhookRegistrationPayload,
      'The saved Gmail watch is invalid.'
    );
    const target = parseWithServiceError(
      mailboxTargetSchema,
      ctx.input.webhookTargetPayload,
      'The saved Gmail mailbox target is invalid.'
    );
    if (
      ctx.input.webhookTargetIdentifier !== mailboxTargetId(saved.accountId) ||
      target.accountId !== saved.accountId ||
      target.mailbox !== saved.mailbox
    )
      throw createApiServiceError('The Gmail renewal target does not match the saved watch.');
    const delivery = parseGooglePubSubDeliveryConfig(
      ctx.input.deliveryConfig,
      'Gmail notification delivery is no longer set up for this OAuth application.'
    );
    if (!isSameGooglePubSubDeliveryConfig(saved.delivery, delivery))
      throw createApiServiceError(
        'The Gmail delivery destination changed; create a new callback subscription.'
      );
    const client = new Client({ token: ctx.auth.token, userId: ctx.config.userId });
    await assertMailbox(client, saved);
    // Re-watching is a safe update; renewal must keep the original baseline history ID.
    return result({ ...saved, expiresAt: await watch(client, delivery.topicName) });
  },
  webhookUnregister: async ctx => {
    const saved = parseWithServiceError(
      mailboxRegistrationSchema,
      ctx.input.webhookRegistrationPayload,
      'The saved Gmail watch is invalid.'
    );
    const client = new Client({ token: ctx.auth.token, userId: ctx.config.userId });
    await assertMailbox(client, saved);
    if (Date.parse(saved.expiresAt) <= Date.now()) return;
    // No watch get/list API: only a successful users.stop counts; errors, even 404, stay retryable.
    await client.stopMailboxWatch();
  }
} satisfies SlateTriggerGroupWebhookAutoRegistrationParameters<
  { userId: string },
  { token: string }
>;
