// Stripe cannot emit forged signatures, malformed snapshots, or deliberately mismatched
// account/mode deliveries. These local SDK contract tests cover those boundaries and
// callback lifecycle RPCs that the private tools E2E harness does not exercise. Stubbed
// registration calls verify our contract only; provider acceptance requires live delivery.
import { createHmacSignature } from '@slates/provider';
import {
  createLocalSlateTestClient,
  mapSlateTriggerEvent,
  processSlateTriggerGroupWebhook
} from '@slates/test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { provider } from './index';
import { StripeClient } from './lib/client';
import { stripeServiceError } from './lib/errors';
import {
  enabledStripeEvents,
  matchesStripeEvent,
  stripeEventTypes
} from './triggers/event-types';
import { stripeEvents } from './triggers/events-trigger-group';

const target = { accountId: 'acct_test', livemode: false };
const registration = {
  ...target,
  endpointId: 'we_test',
  signingSecret: 'whsec_local_signature_test'
};
const webhookUrl = 'https://example.com/stripe-events';
const envelope = (
  type = 'customer.created',
  resource: Record<string, unknown> = { id: 'cus_test', object: 'customer' }
) => ({
  id: 'evt_test',
  object: 'event',
  type,
  created: 1700000000,
  livemode: false,
  data: { object: resource }
});
const signedHeader = (
  raw: string,
  timestamp = Math.floor(Date.now() / 1000),
  secret = registration.signingSecret
) =>
  `t=${timestamp},v1=${createHmacSignature({ secret, payload: `${timestamp}.${raw}`, digest: 'hex' })}`;
const clients: ReturnType<typeof createLocalSlateTestClient>[] = [];
const client = () => {
  const result = createLocalSlateTestClient({ slate: provider, state: { config: {} } });
  result.setAuth({ authenticationMethodId: 'api_key', output: { token: 'sk_test_local' } });
  clients.push(result);
  return result;
};
const process = (
  body: unknown = envelope(),
  options: {
    raw?: string;
    header?: string | null;
    registration?: unknown;
    method?: string;
  } = {}
) => {
  const raw = options.raw ?? JSON.stringify(body);
  const header = options.header === undefined ? signedHeader(raw) : options.header;
  return processSlateTriggerGroupWebhook({
    client: client(),
    triggerGroupId: 'events',
    url: webhookUrl,
    method: options.method ?? 'POST',
    body: raw,
    headers: header === null ? {} : { 'stripe-signature': header },
    webhookRegistrationPayload:
      options.registration === undefined ? registration : options.registration
  });
};

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(clients.splice(0).map(c => c.close()));
});

describe('Stripe delivery contract', () => {
  // Docs and payload example: https://docs.stripe.com/api/webhook_endpoints/create
  it('advertises one automatic group and six associated triggers', async () => {
    const groups = await client().listTriggerGroups();
    expect(groups.triggerGroups).toHaveLength(1);
    expect(groups.triggerGroups[0]).toMatchObject({ id: 'events' });
    expect(stripeEvents.webhook?.autoRegistration).toBeDefined();
    expect(stripeEvents.webhook?.manualRegistration).toBeUndefined();
  });

  // Docs and payload example: https://docs.stripe.com/api/events/object
  it('preserves snapshots, routes to the account and mode, and uses stable event IDs', async () => {
    const body = {
      ...envelope(),
      request: { id: 'req_test' },
      data: {
        previous_attributes: { name: 'before' },
        object: { id: 'cus_test', object: 'customer', metadata: { arbitrary: 'retained' } }
      }
    };
    const first = await process(body);
    const second = await process(body);
    expect(first.response?.status).toBe(200);
    expect(first.events).toEqual(second.events);
    expect(first.events[0]).toMatchObject({
      payload: body,
      matchers: [target],
      idempotencyKey: 'evt_test',
      triggerIds: ['customer_events']
    });
  });

  // Docs and payload example: https://docs.stripe.com/webhooks/signature
  // Docs and payload example: https://docs.stripe.com/api/events/object
  it('accepts a valid signature during rotation', async () => {
    const raw = JSON.stringify(envelope());
    const result = await process(undefined, {
      raw,
      header: `${signedHeader(raw)},v1=${'0'.repeat(64)}`
    });
    expect(result.events).toHaveLength(1);
  });

  // Docs and payload example: https://docs.stripe.com/webhooks/signature
  // Docs and payload example: https://docs.stripe.com/api/events/object
  it('rejects invalid authentication, changed raw bodies, and replay timestamps', async () => {
    const raw = JSON.stringify(envelope());
    const now = Math.floor(Date.now() / 1000);
    for (const header of [
      null,
      't=NaN,v1=abc',
      `t=${now},v0=abc`,
      signedHeader(raw, now, 'wrong'),
      signedHeader(raw, now - 600),
      signedHeader(raw, now + 600),
      `${signedHeader(raw)},t=${now}`
    ]) {
      const result = await process(undefined, { raw, header });
      expect(result.response?.status).toBe(400);
      expect(result.events).toEqual([]);
    }
    expect(
      (await process(undefined, { raw: `${raw} `, header: signedHeader(raw) })).response
        ?.status
    ).toBe(400);
  });

  // Docs and payload example: https://docs.stripe.com/api/webhook_endpoints/create
  it('validates JSON/envelopes and returns explicit method and registration errors', async () => {
    for (const raw of [
      '{',
      'null',
      '[]',
      '{}',
      JSON.stringify({ ...envelope(), id: '' }),
      JSON.stringify({ ...envelope(), livemode: 'false' }),
      JSON.stringify({ ...envelope(), data: { object: null } })
    ]) {
      expect((await process(undefined, { raw })).response?.status).toBe(400);
    }
    expect((await process(undefined, { method: 'PUT' })).response?.status).toBe(405);
    expect(
      (await process(undefined, { registration: { secret: registration.signingSecret } }))
        .response?.status
    ).toBe(500);
  });

  // Docs and payload example: https://docs.stripe.com/api/events/object
  it('acknowledges unsupported events and wrong account/mode without routing', async () => {
    for (const body of [
      envelope('product.created', { id: 'prod_test', object: 'product' }),
      { ...envelope(), account: 'acct_other' },
      { ...envelope(), livemode: true }
    ]) {
      const result = await process(body);
      expect(result.response?.status).toBe(200);
      expect(result.events).toEqual([]);
    }
    expect((await process({ ...envelope(), account: target.accountId })).events).toHaveLength(
      1
    );
  });

  // Docs and payload example: https://docs.stripe.com/api/events/object
  it('selects exact event categories and resource types defensively', () => {
    for (const [category, events] of Object.entries(stripeEventTypes)) {
      for (const event of events) {
        const object = event.startsWith('customer.subscription.')
          ? 'subscription'
          : event.startsWith('customer.source.')
            ? 'card'
            : event.startsWith('charge.dispute.')
              ? 'dispute'
              : event.startsWith('checkout.')
                ? 'checkout.session'
                : event.split('.')[0];
        const payload = envelope(event, { id: 'resource_test', object });
        const selected = Object.keys(stripeEventTypes).filter(key =>
          matchesStripeEvent(key as keyof typeof stripeEventTypes, payload)
        );
        expect(selected).toEqual([category]);
      }
    }
    for (const payload of [
      null,
      [],
      {},
      'customer.created',
      envelope('customer.created', { object: 'subscription' })
    ]) {
      expect(matchesStripeEvent('customer', payload)).toBe(false);
    }
  });
});

describe('Stripe snapshot mapping', () => {
  // Each case below links its concrete payload example.
  it.each([
    // Payload example: https://docs.stripe.com/api/disputes/object
    [
      'payment_events',
      'charge.dispute.created',
      {
        id: 'dp_test',
        object: 'dispute',
        amount: 100,
        currency: 'usd',
        status: 'needs_response'
      },
      { resourceId: 'dp_test', resourceType: 'dispute', amount: 100 }
    ],
    // Payload example: https://docs.stripe.com/api/payment_intents/object
    [
      'payment_events',
      'payment_intent.payment_failed',
      {
        id: 'pi_test',
        object: 'payment_intent',
        customer: { id: 'cus_test' },
        last_payment_error: { message: 'Declined' }
      },
      { customerId: 'cus_test', failureMessage: 'Declined' }
    ],
    // Payload example: https://docs.stripe.com/api/customers/delete
    [
      'customer_events',
      'customer.deleted',
      { id: 'cus_test', object: 'customer' },
      { customerId: 'cus_test', deleted: true }
    ],
    // Payload example: https://docs.stripe.com/api/cards/object
    [
      'customer_events',
      'customer.source.deleted',
      { id: 'card_test', object: 'card', customer: { id: 'cus_test' }, deleted: true },
      { customerId: 'cus_test', deleted: false }
    ],
    // Payload example: https://docs.stripe.com/api/subscriptions/object
    [
      'subscription_events',
      'customer.subscription.updated',
      {
        id: 'sub_test',
        object: 'subscription',
        customer: { id: 'cus_test' },
        status: 'active',
        items: {
          data: [
            {
              id: 'si_test',
              price: { id: 'price_test' },
              current_period_start: 100,
              current_period_end: 200
            }
          ],
          has_more: false
        }
      },
      {
        subscriptionId: 'sub_test',
        customerId: 'cus_test',
        currentPeriodStart: 100,
        currentPeriodEnd: 200,
        items: [
          {
            subscriptionItemId: 'si_test',
            priceId: 'price_test',
            currentPeriodStart: 100,
            currentPeriodEnd: 200
          }
        ]
      }
    ],
    // Payload example: https://docs.stripe.com/api/invoices/object
    [
      'invoice_events',
      'invoice.paid',
      {
        id: 'in_test',
        object: 'invoice',
        customer: { id: 'cus_test' },
        parent: { subscription_details: { subscription: { id: 'sub_test' } } },
        status: 'paid',
        total: 100,
        currency: 'usd'
      },
      { invoiceId: 'in_test', customerId: 'cus_test', subscriptionId: 'sub_test' }
    ],
    // Payload example: https://docs.stripe.com/api/checkout/sessions/object
    [
      'checkout_events',
      'checkout.session.async_payment_succeeded',
      {
        id: 'cs_test',
        object: 'checkout.session',
        customer: { id: 'cus_test' },
        mode: 'payment',
        payment_status: 'paid',
        status: 'complete',
        payment_intent: { id: 'pi_test' },
        subscription: null
      },
      { sessionId: 'cs_test', customerId: 'cus_test', paymentIntentId: 'pi_test' }
    ],
    // Payload example: https://docs.stripe.com/api/payouts/object
    [
      'payout_events',
      'payout.paid',
      { id: 'po_test', object: 'payout', amount: 100, currency: 'usd', status: 'paid' },
      { payoutId: 'po_test', amount: 100 }
    ]
  ] as const)('maps %s / %s through the SDK', async (triggerId, type, resource, expected) => {
    const input = envelope(type, resource);
    expect((await process(input)).events[0]?.triggerIds).toEqual([triggerId]);
    const result = await mapSlateTriggerEvent({
      client: client(),
      triggerId,
      input,
      output: expected,
      type
    });
    expect(result.id).toBe('evt_test');
  });

  // Docs and payload example: https://docs.stripe.com/api/cards/object
  // Docs and payload example: https://docs.stripe.com/api/payouts/object
  it('does not invent customer IDs from source IDs or accept malformed category resources', async () => {
    await expect(
      client().mapTriggerEvent(
        'customer_events',
        envelope('customer.source.created', { id: 'card_test', object: 'card' })
      )
    ).rejects.toThrow();
    await expect(
      client().mapTriggerEvent(
        'payout_events',
        envelope('payout.paid', { id: 'po_test', object: 'payout', amount: '100' })
      )
    ).rejects.toThrow();
  });

  // Docs and payload example: https://docs.stripe.com/api/refunds/object
  // Docs and payload example: https://docs.stripe.com/api/subscription_items/object
  it('accepts nullable refund status and subscription item quantity without inventing values', async () => {
    const refund = await client().mapTriggerEvent(
      'payment_events',
      envelope('refund.created', {
        id: 're_test',
        object: 'refund',
        amount: 100,
        currency: 'usd',
        status: null
      })
    );
    expect(refund.output.status).toBeUndefined();
    const subscription = await client().mapTriggerEvent(
      'subscription_events',
      envelope('customer.subscription.created', {
        id: 'sub_test',
        object: 'subscription',
        customer: 'cus_test',
        status: 'active',
        items: {
          has_more: false,
          data: [
            {
              id: 'si_test',
              price: 'price_test',
              quantity: null,
              current_period_start: 100,
              current_period_end: 200
            }
          ]
        }
      })
    );
    expect(subscription.output.items).toEqual([
      {
        subscriptionItemId: 'si_test',
        priceId: 'price_test',
        currentPeriodStart: 100,
        currentPeriodEnd: 200
      }
    ]);
  });

  // Docs and payload example: https://docs.stripe.com/api/invoices/object
  // Docs and payload example: https://docs.stripe.com/api/subscriptions/object
  it('does not use legacy invoice relationships or subscription periods', async () => {
    const invoice = await client().mapTriggerEvent(
      'invoice_events',
      envelope('invoice.paid', {
        id: 'in_test',
        object: 'invoice',
        customer: null,
        subscription: 'sub_legacy',
        status: 'paid',
        total: 100,
        currency: 'usd'
      })
    );
    expect(invoice.output.subscriptionId).toBeNull();
    await expect(
      client().mapTriggerEvent(
        'subscription_events',
        envelope('customer.subscription.updated', {
          id: 'sub_test',
          object: 'subscription',
          customer: 'cus_test',
          status: 'active',
          current_period_start: 1,
          current_period_end: 2
        })
      )
    ).rejects.toThrow();
    for (const [has_more, start, end] of [
      [false, 100, 210],
      [false, 110, 200],
      [true, 100, 200]
    ] as const) {
      const result = await client().mapTriggerEvent(
        'subscription_events',
        envelope('customer.subscription.updated', {
          id: 'sub_test',
          object: 'subscription',
          customer: 'cus_test',
          status: 'active',
          current_period_start: 1,
          current_period_end: 2,
          items: {
            data: [
              {
                id: 'si_1',
                price: 'price_1',
                current_period_start: 100,
                current_period_end: 200
              },
              {
                id: 'si_2',
                price: 'price_2',
                current_period_start: start,
                current_period_end: end
              }
            ],
            has_more
          }
        })
      );
      expect(result.output.currentPeriodStart).toBeUndefined();
      expect(result.output.currentPeriodEnd).toBeUndefined();
    }
  });
});

describe('Stripe automatic registration SDK contracts', () => {
  beforeEach(() => {
    vi.spyOn(StripeClient.prototype, 'getAccount').mockResolvedValue({ id: target.accountId });
    vi.spyOn(StripeClient.prototype, 'getBalance').mockResolvedValue({ livemode: false });
    vi.spyOn(StripeClient.prototype, 'createWebhookEndpoint').mockResolvedValue({
      id: registration.endpointId,
      secret: registration.signingSecret,
      livemode: false
    });
    vi.spyOn(StripeClient.prototype, 'deleteWebhookEndpoint').mockResolvedValue({
      deleted: true
    });
  });
  const register = (payload: unknown = target, identifier = 'acct_test:test') =>
    client().registerTriggerGroupWebhook({
      triggerGroupId: 'events',
      webhookTargetIdentifier: identifier,
      webhookTargetPayload: payload,
      webhookUrl
    });
  const unregister = () =>
    client().unregisterTriggerGroupWebhook({
      triggerGroupId: 'events',
      webhookRegistrationIdentifier: '',
      webhookRegistrationPayload: registration
    });

  // Docs and payload example: https://docs.stripe.com/api/webhook_endpoints/create
  it('discovers a shared target and matching routing identities', async () => {
    const c = client();
    expect(await c.listTriggerGroupWebhookTargets({ triggerGroupId: 'events' })).toMatchObject(
      {
        targets: [
          {
            webhookTargetIdentifier: 'acct_test:test',
            webhookTargetPayload: target,
            metadata: target,
            targetOwnership: 'multi_user'
          }
        ],
        nextPageToken: null
      }
    );
    expect(await c.getTriggerGroupRoutingMatchers('events')).toMatchObject({
      matchers: [target]
    });
    await expect(
      c.listTriggerGroupWebhookTargets({ triggerGroupId: 'events', pageToken: 'invalid' })
    ).rejects.toThrow();
  });

  // Docs and payload example: https://docs.stripe.com/api/webhook_endpoints/create
  it('creates one endpoint with exactly the supported event union and saves verification data', async () => {
    expect(await register()).toMatchObject({
      webhookRegistrationIdentifier: 'we_test',
      webhookRegistrationPayload: registration
    });
    expect(StripeClient.prototype.createWebhookEndpoint).toHaveBeenCalledWith({
      url: webhookUrl,
      connect: false,
      enabled_events: enabledStripeEvents
    });
    expect(new Set(enabledStripeEvents).size).toBe(enabledStripeEvents.length);
  });

  // Docs and payload example: https://docs.stripe.com/api/webhook_endpoints/create
  it('rejects stale or altered targets before creating anything', async () => {
    await expect(register({ ...target, accountId: 'acct_other' })).rejects.toThrow();
    await expect(register({ ...target, livemode: true })).rejects.toThrow();
    await expect(register(target, 'wrong')).rejects.toThrow();
    expect(StripeClient.prototype.createWebhookEndpoint).not.toHaveBeenCalled();
  });

  // Docs and payload example: https://docs.stripe.com/api/webhook_endpoints/create
  it('removes endpoints when their returned secret or mode is invalid', async () => {
    for (const endpoint of [
      { id: 'we_test', livemode: false },
      { id: 'we_test', secret: registration.signingSecret, livemode: true }
    ]) {
      vi.mocked(StripeClient.prototype.createWebhookEndpoint).mockResolvedValueOnce(endpoint);
      await expect(register()).rejects.toThrow();
      expect(StripeClient.prototype.deleteWebhookEndpoint).toHaveBeenCalledWith('we_test');
    }
  });

  // Docs and payload example: https://docs.stripe.com/api/webhook_endpoints/create
  it('uses the saved endpoint ID and only tolerates confirmed missing endpoints', async () => {
    await unregister();
    expect(StripeClient.prototype.deleteWebhookEndpoint).toHaveBeenCalledWith('we_test');
    vi.mocked(StripeClient.prototype.deleteWebhookEndpoint).mockRejectedValueOnce(
      stripeServiceError('Missing', { upstreamStatus: 404 })
    );
    await expect(unregister()).resolves.toBeDefined();
    for (const status of [401, 403, 429, 500]) {
      vi.mocked(StripeClient.prototype.deleteWebhookEndpoint).mockRejectedValueOnce(
        stripeServiceError('Failure', { upstreamStatus: status })
      );
      await expect(unregister()).rejects.toThrow();
    }
  });

  // Docs and payload example: https://docs.stripe.com/api/webhook_endpoints/create
  it('does not remove endpoints with credentials in a different mode', async () => {
    vi.mocked(StripeClient.prototype.getBalance).mockResolvedValueOnce({ livemode: true });
    await expect(unregister()).rejects.toThrow();
    expect(StripeClient.prototype.deleteWebhookEndpoint).not.toHaveBeenCalled();
  });
});
