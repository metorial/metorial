// User-requested unit tests against documented payload examples. No live Stripe calls.
// Stripe's snapshot envelope and event-to-resource contract:
// https://docs.stripe.com/api/events/object
// https://docs.stripe.com/api/events/types
import { createHmacSignature } from '@slates/provider';
import { createLocalSlateTestClient, processSlateTriggerGroupWebhook } from '@slates/test';
import { afterEach, describe, expect, it } from 'vitest';
import { provider } from './index';
import { STRIPE_API_VERSION } from './lib/client';
import { enabledStripeEvents } from './triggers/event-types';
import { expectedStripeOutputs, stripePayloadExamples } from './webhooks.payloads.fixtures';

const registration = {
  accountId: 'acct_example',
  livemode: false,
  endpointId: 'we_example',
  signingSecret: 'whsec_documented_payload_tests'
};
const clients: ReturnType<typeof createLocalSlateTestClient>[] = [];
const createClient = () => {
  const client = createLocalSlateTestClient({ slate: provider, state: { config: {} } });
  client.setAuth({ authenticationMethodId: 'api_key', output: { token: 'sk_test_local' } });
  clients.push(client);
  return client;
};
afterEach(async () => {
  await Promise.all(clients.splice(0).map(client => client.close()));
});

const deliver = async (
  type: string,
  resource: Record<string, unknown>,
  extra: Record<string, unknown> = {}
) => {
  const client = createClient();
  // Envelope example: https://docs.stripe.com/api/events/object
  // Replace its example setup_intent with the resource documented for each event.
  const event = {
    id: 'evt_documented_example',
    object: 'event',
    api_version: STRIPE_API_VERSION,
    created: 1686089970,
    data: { object: resource },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type,
    ...extra
  };
  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmacSignature({
    secret: registration.signingSecret,
    payload: `${timestamp}.${body}`,
    digest: 'hex'
  });
  const result = await processSlateTriggerGroupWebhook({
    client,
    triggerGroupId: 'events',
    url: 'https://example.com/stripe-events',
    body,
    headers: { 'stripe-signature': `t=${timestamp},v1=${signature}` },
    webhookRegistrationPayload: registration
  });
  return { client, event, result };
};

const exampleCase = (
  event: string,
  example: keyof typeof stripePayloadExamples,
  resourcePatch: Record<string, unknown> = {},
  outputPatch: Record<string, unknown> = {}
) => ({
  event,
  example,
  resource: { ...stripePayloadExamples[example], ...resourcePatch },
  expected: { ...expectedStripeOutputs[example], ...outputPatch }
});

// Every row is a separate named test. Start with the linked object example and
// adapt only the explicit lifecycle fields; these are not verbatim event deliveries.
const cases = {
  payment: [
    // Payload example: https://docs.stripe.com/api/payment_intents/object
    exampleCase(
      'payment_intent.created',
      'payment_intent',
      { status: 'requires_payment_method' },
      { status: 'requires_payment_method' }
    ),
    // Payload example: https://docs.stripe.com/api/payment_intents/object
    exampleCase(
      'payment_intent.succeeded',
      'payment_intent',
      { status: 'succeeded' },
      { status: 'succeeded' }
    ),
    // Payload example: https://docs.stripe.com/api/payment_intents/object
    exampleCase(
      'payment_intent.payment_failed',
      'payment_intent',
      {
        status: 'requires_payment_method',
        last_payment_error: { message: 'Your card was declined.', code: 'card_declined' }
      },
      { status: 'requires_payment_method', failureMessage: 'Your card was declined.' }
    ),
    // Payload example: https://docs.stripe.com/api/payment_intents/object
    exampleCase(
      'payment_intent.canceled',
      'payment_intent',
      { status: 'canceled' },
      { status: 'canceled' }
    ),
    // Payload example: https://docs.stripe.com/api/payment_intents/object
    exampleCase(
      'payment_intent.requires_action',
      'payment_intent',
      { status: 'requires_action' },
      { status: 'requires_action' }
    ),
    // Payload example: https://docs.stripe.com/api/payment_intents/object
    exampleCase(
      'payment_intent.amount_capturable_updated',
      'payment_intent',
      { status: 'requires_capture' },
      { status: 'requires_capture' }
    ),
    // Payload example: https://docs.stripe.com/api/charges/object
    exampleCase('charge.succeeded', 'charge', {}, {}),
    // Payload example: https://docs.stripe.com/api/charges/object
    exampleCase(
      'charge.failed',
      'charge',
      { status: 'failed', failure_message: 'Your card was declined.', receipt_url: null },
      { status: 'failed', failureMessage: 'Your card was declined.', receiptUrl: null }
    ),
    // Payload example: https://docs.stripe.com/api/charges/object
    exampleCase('charge.refunded', 'charge', { refunded: true, amount_refunded: 1099 }, {}),
    // Payload example: https://docs.stripe.com/api/charges/object
    exampleCase('charge.captured', 'charge', { captured: true }, {}),
    // Payload example: https://docs.stripe.com/api/charges/object
    exampleCase(
      'charge.updated',
      'charge',
      { description: 'Updated receipt description' },
      { description: 'Updated receipt description' }
    ),
    // Payload example: https://docs.stripe.com/api/disputes/object
    exampleCase(
      'charge.dispute.created',
      'dispute',
      { status: 'warning_needs_response' },
      { status: 'warning_needs_response' }
    ),
    // Payload example: https://docs.stripe.com/api/disputes/object
    exampleCase('charge.dispute.closed', 'dispute', { status: 'won' }, { status: 'won' }),
    // Payload example: https://docs.stripe.com/api/refunds/object
    exampleCase('refund.created', 'refund', { status: 'pending' }, { status: 'pending' }),
    // Payload example: https://docs.stripe.com/api/refunds/object
    exampleCase('refund.updated', 'refund', { status: 'succeeded' }, { status: 'succeeded' }),
    // Payload example: https://docs.stripe.com/api/refunds/object
    exampleCase('refund.failed', 'refund', { status: 'failed' }, { status: 'failed' })
  ],
  customer: [
    // Payload example: https://docs.stripe.com/api/customers/object
    exampleCase('customer.created', 'customer', {}, {}),
    // Payload example: https://docs.stripe.com/api/customers/object
    exampleCase(
      'customer.updated',
      'customer',
      { name: 'Updated customer' },
      { name: 'Updated customer' }
    ),
    // Payload example: https://docs.stripe.com/api/customers/object
    exampleCase('customer.deleted', 'customer', { deleted: true }, { deleted: true }),
    // Payload example: https://docs.stripe.com/api/cards/object
    exampleCase('customer.source.created', 'card', {}, {}),
    // Payload example: https://docs.stripe.com/api/cards/object
    exampleCase('customer.source.updated', 'card', { metadata: { note: 'updated' } }, {}),
    // Payload example: https://docs.stripe.com/api/cards/object
    exampleCase('customer.source.deleted', 'card', {}, {}),
    // Payload example: https://docs.stripe.com/api/customer_bank_accounts/object
    exampleCase('customer.source.created', 'bank_account', {}, {}),
    // Payload example: https://docs.stripe.com/api/customer_bank_accounts/object
    exampleCase(
      'customer.source.updated',
      'bank_account',
      { metadata: { note: 'updated' } },
      {}
    ),
    // Payload example: https://docs.stripe.com/api/customer_bank_accounts/object
    exampleCase('customer.source.deleted', 'bank_account', {}, {}),
    // Payload example: https://docs.stripe.com/api/sources/attach
    exampleCase('customer.source.created', 'source', {}, {}),
    // Payload example: https://docs.stripe.com/api/sources/attach
    exampleCase('customer.source.updated', 'source', { metadata: { note: 'updated' } }, {}),
    // Payload example: https://docs.stripe.com/api/sources/attach
    exampleCase('customer.source.deleted', 'source', {}, {})
  ],
  subscription: [
    // Payload example: https://docs.stripe.com/api/subscriptions/object
    exampleCase('customer.subscription.created', 'subscription', {}, {}),
    // Payload example: https://docs.stripe.com/api/subscriptions/object
    exampleCase(
      'customer.subscription.updated',
      'subscription',
      { cancel_at_period_end: true },
      { cancelAtPeriodEnd: true }
    ),
    // Payload example: https://docs.stripe.com/api/subscriptions/object
    exampleCase(
      'customer.subscription.deleted',
      'subscription',
      { status: 'canceled', canceled_at: 1682288167 },
      { status: 'canceled', canceledAt: 1682288167 }
    ),
    // Payload example: https://docs.stripe.com/api/subscriptions/object
    exampleCase(
      'customer.subscription.paused',
      'subscription',
      { status: 'paused' },
      { status: 'paused' }
    ),
    // Payload example: https://docs.stripe.com/api/subscriptions/object
    exampleCase('customer.subscription.resumed', 'subscription', {}, {}),
    // Payload example: https://docs.stripe.com/api/subscriptions/object
    exampleCase(
      'customer.subscription.trial_will_end',
      'subscription',
      { status: 'trialing', trial_start: 1679609767, trial_end: 1682288167 },
      { status: 'trialing', trialStart: 1679609767, trialEnd: 1682288167 }
    ),
    // Payload example: https://docs.stripe.com/api/subscriptions/object
    exampleCase('customer.subscription.pending_update_applied', 'subscription', {}, {}),
    // Payload example: https://docs.stripe.com/api/subscriptions/object
    exampleCase('customer.subscription.pending_update_expired', 'subscription', {}, {})
  ],
  invoice: [
    // Payload example: https://docs.stripe.com/api/invoices/object
    exampleCase('invoice.created', 'invoice', { status: 'draft' }, { status: 'draft' }),
    // Payload example: https://docs.stripe.com/api/invoices/object
    exampleCase('invoice.finalized', 'invoice', { status: 'open' }, { status: 'open' }),
    // Payload example: https://docs.stripe.com/api/invoices/object
    exampleCase('invoice.paid', 'invoice', { status: 'paid' }, { status: 'paid' }),
    // Payload example: https://docs.stripe.com/api/invoices/object
    exampleCase('invoice.payment_failed', 'invoice', { status: 'open' }, { status: 'open' }),
    // Payload example: https://docs.stripe.com/api/invoices/object
    exampleCase(
      'invoice.payment_succeeded',
      'invoice',
      { status: 'paid' },
      { status: 'paid' }
    ),
    // Payload example: https://docs.stripe.com/api/invoices/object
    exampleCase('invoice.sent', 'invoice', { status: 'open' }, { status: 'open' }),
    // Payload example: https://docs.stripe.com/api/invoices/object
    exampleCase('invoice.updated', 'invoice', { status: 'draft' }, { status: 'draft' }),
    // Payload example: https://docs.stripe.com/api/invoices/object
    exampleCase('invoice.voided', 'invoice', { status: 'void' }, { status: 'void' }),
    // Payload example: https://docs.stripe.com/api/invoices/object
    exampleCase(
      'invoice.marked_uncollectible',
      'invoice',
      { status: 'uncollectible' },
      { status: 'uncollectible' }
    ),
    // Payload example: https://docs.stripe.com/api/invoices/object
    exampleCase('invoice.overdue', 'invoice', { status: 'open' }, { status: 'open' }),
    // Payload example: https://docs.stripe.com/api/invoices/object
    exampleCase(
      'invoice.payment_action_required',
      'invoice',
      { status: 'open' },
      { status: 'open' }
    )
  ],
  checkout: [
    // Payload example: https://docs.stripe.com/api/checkout/sessions/object
    exampleCase(
      'checkout.session.completed',
      'checkout',
      { status: 'complete', payment_status: 'paid' },
      { status: 'complete', paymentStatus: 'paid' }
    ),
    // Payload example: https://docs.stripe.com/api/checkout/sessions/object
    exampleCase(
      'checkout.session.expired',
      'checkout',
      { status: 'expired', payment_status: 'unpaid' },
      { status: 'expired', paymentStatus: 'unpaid' }
    ),
    // Payload example: https://docs.stripe.com/api/checkout/sessions/object
    exampleCase(
      'checkout.session.async_payment_succeeded',
      'checkout',
      { status: 'complete', payment_status: 'paid' },
      { status: 'complete', paymentStatus: 'paid' }
    ),
    // Payload example: https://docs.stripe.com/api/checkout/sessions/object
    exampleCase(
      'checkout.session.async_payment_failed',
      'checkout',
      { status: 'complete', payment_status: 'unpaid' },
      { status: 'complete', paymentStatus: 'unpaid' }
    )
  ],
  payout: [
    // Payload example: https://docs.stripe.com/api/payouts/object
    exampleCase('payout.created', 'payout', { status: 'pending' }, { status: 'pending' }),
    // Payload example: https://docs.stripe.com/api/payouts/object
    exampleCase('payout.paid', 'payout', { status: 'paid' }, { status: 'paid' }),
    // Payload example: https://docs.stripe.com/api/payouts/object
    exampleCase(
      'payout.failed',
      'payout',
      { status: 'failed', failure_message: 'The bank account has been closed.' },
      { status: 'failed', failureMessage: 'The bank account has been closed.' }
    ),
    // Payload example: https://docs.stripe.com/api/payouts/object
    exampleCase('payout.canceled', 'payout', { status: 'canceled' }, { status: 'canceled' }),
    // Payload example: https://docs.stripe.com/api/payouts/object
    exampleCase(
      'payout.updated',
      'payout',
      { status: 'in_transit' },
      { status: 'in_transit' }
    ),
    // Payload example: https://docs.stripe.com/api/payouts/object
    exampleCase(
      'payout.reconciliation_completed',
      'payout',
      { status: 'paid' },
      { status: 'paid' }
    )
  ]
};

for (const [category, examples] of Object.entries(cases)) {
  describe(`${category} webhook documented payloads`, () => {
    // Each row above links its concrete data.object example; the full envelope example is:
    // https://docs.stripe.com/api/events/object
    it.each(
      examples
    )('$event ($example) verifies, selects, and maps the documented fields', async ({
      event: type,
      resource,
      expected
    }) => {
      const { client, event, result } = await deliver(type, resource);
      expect(result.response?.status).toBe(200);
      expect(result.events).toHaveLength(1);
      const received = result.events[0]!;
      expect(received).toMatchObject({
        payload: event,
        idempotencyKey: event.id,
        matchers: [{ accountId: 'acct_example', livemode: false }],
        triggerIds: [`${category}_events`]
      });
      const mapped = await client.mapTriggerEvent(`${category}_events`, received.payload);
      expect(mapped).toEqual({ type, id: event.id, output: expected });
    });
  });
}

describe('Documented webhook envelope variants', () => {
  // Event payload example and nullable account attribute: https://docs.stripe.com/api/events/object
  it('routes an explicit null account as an account-scoped delivery', async () => {
    const { result } = await deliver('customer.created', stripePayloadExamples.customer, {
      account: null
    });
    expect(result.response?.status).toBe(200);
    expect(result.events[0]?.matchers).toEqual([
      { accountId: 'acct_example', livemode: false }
    ]);
  });

  // Customer deletion response example: https://docs.stripe.com/api/customers/delete
  // Use the documented deleted-customer representation inside the event envelope.
  it('maps the minimal deleted-customer representation without requiring live-customer fields', async () => {
    const { client, result } = await deliver('customer.deleted', {
      id: 'cus_NffrFeUfNV2Hib',
      object: 'customer',
      deleted: true
    });
    const received = result.events[0]!;
    expect(received.triggerIds).toEqual(['customer_events']);
    const mapped = await client.mapTriggerEvent('customer_events', received.payload);
    expect(mapped.output).toEqual({
      customerId: 'cus_NffrFeUfNV2Hib',
      email: null,
      name: null,
      phone: null,
      description: null,
      deleted: true
    });
  });

  // Payload examples by resource: https://docs.stripe.com/api/events/object
  // Supported event/resource definitions: https://docs.stripe.com/api/events/types
  it('has an independent documented test case for every registered event type', () => {
    const covered = new Set(
      Object.values(cases)
        .flat()
        .map(example => example.event)
    );
    expect([...covered].sort()).toEqual([...enabledStripeEvents].sort());
    expect(covered.size).toBe(51);
  });
});
