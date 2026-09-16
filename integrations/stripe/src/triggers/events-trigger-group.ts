import { isServiceError } from '@lowerdeck/error';
import { triggerGroup } from '@slates/provider';
import { StripeClient, type StripeClientConfig } from '../lib/client';
import { stripeServiceError } from '../lib/errors';
import { spec } from '../spec';
import { stripeEventEnvelopeSchema } from './event-schemas';
import { enabledStripeEvents } from './event-types';
import {
  processStripeWebhook,
  stripeRegistrationSchema,
  stripeTargetIdentifier,
  stripeTargetSchema
} from './webhook';

const resolveTarget = async (client: StripeClient) => {
  const [account, balance] = await Promise.all([client.getAccount(), client.getBalance()]);
  const target = stripeTargetSchema.safeParse({
    accountId: account?.id,
    livemode: balance?.livemode
  });
  if (!target.success)
    throw stripeServiceError('Stripe did not return a valid account identity and mode.');
  return target.data;
};
const connectionClient = (auth: { token: string }, config: { stripeAccountId?: string }) =>
  new StripeClient({ token: auth.token, stripeAccountId: config.stripeAccountId });

const removeEndpoint = async (client: StripeClient, endpointId: string) => {
  try {
    await client.deleteWebhookEndpoint(endpointId);
  } catch (error) {
    if (isServiceError(error) && Number(error.data.upstreamStatus) === 404) return;
    throw error;
  }
};

export const stripeEvents = triggerGroup(spec, {
  key: 'events',
  name: 'Stripe Events',
  description:
    'Payment, customer, subscription, invoice, Checkout, and payout events for your Stripe account.',
  eventSchema: stripeEventEnvelopeSchema
})
  .webhook({
    autoRegistration: {
      webhookTargetList: async ctx => {
        if (ctx.input.pageToken !== null && ctx.input.pageToken !== undefined) {
          throw stripeServiceError('Stripe event targets do not support pagination tokens.');
        }
        const target = await resolveTarget(connectionClient(ctx.auth, ctx.config));
        return {
          targets: [
            {
              webhookTargetIdentifier: stripeTargetIdentifier(target),
              name: `${target.accountId} (${target.livemode ? 'live' : 'test'})`,
              metadata: { ...target },
              webhookTargetPayload: target,
              targetOwnership: 'multi_user' as const
            }
          ],
          nextPageToken: null
        };
      },
      webhookRegister: async ctx => {
        const client = connectionClient(ctx.auth, ctx.config);
        const target = await resolveTarget(client);
        const supplied = stripeTargetSchema.safeParse(ctx.input.webhookTargetPayload);
        if (
          !supplied.success ||
          stripeTargetIdentifier(supplied.data) !== stripeTargetIdentifier(target) ||
          ctx.input.webhookTargetIdentifier !== stripeTargetIdentifier(target)
        ) {
          throw stripeServiceError(
            'The selected Stripe account or mode has changed. Select the event target again.'
          );
        }
        const endpoint = await client.createWebhookEndpoint({
          url: ctx.input.webhookUrl,
          connect: false,
          enabled_events: enabledStripeEvents
        });
        const parsed = stripeRegistrationSchema.safeParse({
          ...target,
          endpointId: endpoint?.id,
          signingSecret: endpoint?.secret
        });
        if (!parsed.success || endpoint.livemode !== target.livemode) {
          const endpointId = stripeRegistrationSchema.shape.endpointId.safeParse(endpoint?.id);
          if (endpointId.success) await removeEndpoint(client, endpointId.data);
          throw stripeServiceError(
            'Stripe returned an invalid webhook endpoint or signing secret.'
          );
        }
        return {
          webhookRegistrationIdentifier: parsed.data.endpointId,
          webhookRegistrationPayload: parsed.data
        };
      },
      webhookUnregister: async ctx => {
        const parsed = stripeRegistrationSchema.safeParse(
          ctx.input.webhookRegistrationPayload
        );
        if (!parsed.success)
          throw stripeServiceError('The saved Stripe webhook registration is invalid.');
        const config: StripeClientConfig = {
          token: ctx.auth.token,
          stripeAccountId: parsed.data.accountId
        };
        const client = new StripeClient(config);
        const target = await resolveTarget(client);
        if (stripeTargetIdentifier(target) !== stripeTargetIdentifier(parsed.data)) {
          throw stripeServiceError(
            'The current Stripe credentials do not match the webhook account and mode.'
          );
        }
        await removeEndpoint(client, parsed.data.endpointId);
      }
    },
    process: ctx => processStripeWebhook(ctx.input)
  })
  // Automatic targets route through subscriptions; the SDK still requires this handler.
  .routingMatchers(async () => [])
  .build();
