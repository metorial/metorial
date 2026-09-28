import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { squareServiceError } from '../lib/errors';
import { createClient, generateIdempotencyKey, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';

type SquareMoney = { amount?: number; currency?: string };
type SquareSubscription = {
  id: string;
  location_id?: string;
  plan_variation_id?: string;
  customer_id?: string;
  status?: string;
  version?: number;
  start_date?: string;
  canceled_date?: string;
  charged_through_date?: string;
  paid_until_date?: string;
  card_id?: string;
  invoice_ids?: string[];
  phases?: { ordinal?: number; order_template_id?: string }[];
  price_override_money?: SquareMoney;
  tax_percentage?: string;
  timezone?: string;
  created_at?: string;
  actions?: Record<string, unknown>[];
};
type SquarePlanVariation = {
  type?: string;
  subscription_plan_variation_data?: {
    phases?: { ordinal?: number; pricing?: { type?: string } }[];
  };
};

const moneyInput = z.object({
  amount: z.number().int().min(0).describe('Nonnegative amount in the smallest currency unit'),
  currency: z.string().length(3).describe('ISO currency code, such as USD')
});
const dateInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe('Date in YYYY-MM-DD format');
const taxPercentageInput = z
  .string()
  .max(10)
  .regex(/^\d+(?:\.\d+)?$/)
  .describe('Decimal percentage without a percent sign, such as 7.5');
const subscriptionOutput = z.object({
  subscriptionId: z.string(),
  locationId: z.string().optional(),
  planVariationId: z.string().optional(),
  customerId: z.string().optional(),
  status: z.string().optional(),
  version: z.number().optional(),
  startDate: z.string().optional(),
  canceledDate: z.string().optional(),
  chargedThroughDate: z.string().optional(),
  paidUntilDate: z.string().optional(),
  cardId: z.string().optional(),
  invoiceIds: z.array(z.string()).optional(),
  phases: z
    .array(
      z.object({ ordinal: z.number().optional(), orderTemplateId: z.string().optional() })
    )
    .optional(),
  priceOverrideMoney: z
    .object({ amount: z.number().optional(), currency: z.string().optional() })
    .optional(),
  taxPercentage: z.string().optional(),
  timezone: z.string().optional(),
  createdAt: z.string().optional(),
  actions: z.array(z.record(z.string(), z.any())).optional()
});

const mapSubscription = (s: SquareSubscription) => ({
  subscriptionId: s.id,
  locationId: s.location_id,
  planVariationId: s.plan_variation_id,
  customerId: s.customer_id,
  status: s.status,
  version: s.version,
  startDate: s.start_date,
  canceledDate: s.canceled_date,
  chargedThroughDate: s.charged_through_date,
  paidUntilDate: s.paid_until_date,
  cardId: s.card_id,
  invoiceIds: s.invoice_ids,
  phases: s.phases?.map(phase => ({
    ordinal: phase.ordinal,
    orderTemplateId: phase.order_template_id
  })),
  priceOverrideMoney: s.price_override_money,
  taxPercentage: s.tax_percentage,
  timezone: s.timezone,
  createdAt: s.created_at,
  actions: s.actions
});

const subscriptionFrom = (response: { subscription?: SquareSubscription }) => {
  if (!response.subscription?.id)
    throw squareServiceError('Square did not return a subscription.');
  return mapSubscription(response.subscription);
};

const writeScopes = [
  'SUBSCRIPTIONS_WRITE',
  'ITEMS_READ',
  'CUSTOMERS_READ',
  'INVOICES_WRITE',
  'ORDERS_WRITE',
  'PAYMENTS_WRITE'
];

const validatePhases = (
  variation: SquarePlanVariation,
  phases?: { ordinal: number; orderTemplateId: string }[]
) => {
  if (variation.type !== 'SUBSCRIPTION_PLAN_VARIATION') {
    throw squareServiceError('planVariationId must identify a SUBSCRIPTION_PLAN_VARIATION.');
  }
  let planPhases = variation.subscription_plan_variation_data?.phases ?? [];
  let hasRelativePricing = planPhases.some(phase => phase.pricing?.type === 'RELATIVE');
  if (hasRelativePricing && !phases?.length) {
    throw squareServiceError(
      'Relative-priced plan variations require phases with an order template for every plan phase.'
    );
  }
  if (
    phases?.length &&
    (phases.length !== planPhases.length ||
      new Set(phases.map(phase => phase.ordinal)).size !== phases.length ||
      phases.some(phase => !planPhases.some(planPhase => planPhase.ordinal === phase.ordinal)))
  ) {
    throw squareServiceError(
      'phases must match every ordinal in the selected subscription plan variation.'
    );
  }
};

export const createSubscription = SlateTool.create(spec, {
  name: 'Create Subscription',
  key: 'create_subscription',
  description:
    'Enroll a customer in a catalog subscription plan variation. A saved card charges automatically; without one, Square emails an invoice.',
  instructions: [
    'Use search_catalog with objectTypes containing SUBSCRIPTION_PLAN_VARIATION to discover a plan variation ID.',
    'Use list_locations and search_customers to discover the location and customer IDs. Use list_cards for an optional saved card.'
  ]
})
  .scopes(
    allOf(
      'SUBSCRIPTIONS_WRITE',
      'ITEMS_READ',
      'CUSTOMERS_READ',
      'INVOICES_WRITE',
      'ORDERS_WRITE',
      'PAYMENTS_WRITE'
    )
  )
  .input(
    z.object({
      locationId: z
        .string()
        .min(1)
        .describe('Location ID. Use list_locations to discover one.'),
      customerId: z
        .string()
        .min(1)
        .describe('Customer ID. Use search_customers to discover one.'),
      planVariationId: z
        .string()
        .min(1)
        .describe(
          'Catalog SUBSCRIPTION_PLAN_VARIATION ID. Use search_catalog to discover one.'
        ),
      phases: z
        .array(
          z.object({
            ordinal: z
              .number()
              .int()
              .min(0)
              .describe('Matching phase ordinal from the plan variation'),
            orderTemplateId: z
              .string()
              .min(1)
              .describe('Draft order template ID from create_order')
          })
        )
        .min(1)
        .optional()
        .describe(
          'Required for relative pricing: one order template for each plan variation phase'
        ),
      idempotencyKey: z
        .string()
        .min(1)
        .max(128)
        .optional()
        .describe('Unique key to safely retry this creation request'),
      startDate: dateInput.optional(),
      canceledDate: dateInput.optional().describe('Optional scheduled cancellation date'),
      cardId: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Optional saved card ID from list_cards; otherwise Square invoices the customer'
        ),
      priceOverrideMoney: moneyInput
        .optional()
        .describe('Optional static plan price override; does not affect relative pricing'),
      taxPercentage: taxPercentageInput.optional(),
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone; defaults to the location timezone')
    })
  )
  .output(subscriptionOutput)
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, writeScopes);
    let client = createClient(ctx.auth);
    let catalog = await client.request<{ object?: SquarePlanVariation }>(
      'GET',
      `/catalog/object/${encodeURIComponent(ctx.input.planVariationId)}`
    );
    if (!catalog.object)
      throw squareServiceError('Square did not return the subscription plan variation.');
    validatePhases(catalog.object, ctx.input.phases);
    let response = await client.request<{ subscription?: SquareSubscription }>(
      'POST',
      '/subscriptions',
      {
        body: {
          idempotency_key: ctx.input.idempotencyKey ?? generateIdempotencyKey(),
          location_id: ctx.input.locationId,
          customer_id: ctx.input.customerId,
          plan_variation_id: ctx.input.planVariationId,
          phases: ctx.input.phases?.map(phase => ({
            ordinal: phase.ordinal,
            order_template_id: phase.orderTemplateId
          })),
          start_date: ctx.input.startDate,
          canceled_date: ctx.input.canceledDate,
          card_id: ctx.input.cardId,
          price_override_money: ctx.input.priceOverrideMoney,
          tax_percentage: ctx.input.taxPercentage,
          timezone: ctx.input.timezone
        }
      }
    );
    let output = subscriptionFrom(response);
    return {
      output,
      message: `Subscription **${output.subscriptionId}** created with status **${output.status ?? 'unknown'}**.`
    };
  })
  .build();

export const searchSubscriptions = SlateTool.create(spec, {
  name: 'Search Subscriptions',
  key: 'search_subscriptions',
  description:
    'Search subscriptions by location or customer, including their billing and cancellation state.',
  tags: { readOnly: true }
})
  .scopes(allOf('SUBSCRIPTIONS_READ'))
  .input(
    z.object({
      locationIds: z
        .array(z.string().min(1))
        .min(1)
        .optional()
        .describe('Location IDs from list_locations'),
      customerIds: z
        .array(z.string().min(1))
        .min(1)
        .optional()
        .describe('Customer IDs from search_customers'),
      cursor: z.string().optional().describe('Cursor from a previous response'),
      limit: z.number().int().min(1).optional().describe('Maximum subscriptions per page'),
      includeActions: z.boolean().optional().describe('Include scheduled subscription actions')
    })
  )
  .output(
    z.object({ subscriptions: z.array(subscriptionOutput), cursor: z.string().optional() })
  )
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, ['SUBSCRIPTIONS_READ']);
    let filter = {
      location_ids: ctx.input.locationIds,
      customer_ids: ctx.input.customerIds
    };
    let response = await createClient(ctx.auth).request<{
      subscriptions?: SquareSubscription[];
      cursor?: string;
    }>('POST', '/subscriptions/search', {
      body: {
        cursor: ctx.input.cursor,
        limit: ctx.input.limit,
        query: ctx.input.locationIds || ctx.input.customerIds ? { filter } : undefined,
        include: ctx.input.includeActions ? ['actions'] : undefined
      }
    });
    let subscriptions = (response.subscriptions ?? []).map(mapSubscription);
    return {
      output: { subscriptions, cursor: response.cursor },
      message: `Found **${subscriptions.length}** subscription(s).`
    };
  })
  .build();

export const getSubscription = SlateTool.create(spec, {
  name: 'Get Subscription',
  key: 'get_subscription',
  description:
    'Retrieve the current subscription, billing dates, card, invoices, and optional scheduled actions.',
  tags: { readOnly: true }
})
  .scopes(allOf('SUBSCRIPTIONS_READ'))
  .input(
    z.object({
      subscriptionId: z
        .string()
        .min(1)
        .describe('Subscription ID from create_subscription or search_subscriptions'),
      includeActions: z.boolean().optional().describe('Include scheduled subscription actions')
    })
  )
  .output(subscriptionOutput)
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, ['SUBSCRIPTIONS_READ']);
    let response = await createClient(ctx.auth).request<{ subscription?: SquareSubscription }>(
      'GET',
      `/subscriptions/${encodeURIComponent(ctx.input.subscriptionId)}`,
      {
        params: { include: ctx.input.includeActions ? 'actions' : undefined }
      }
    );
    let output = subscriptionFrom(response);
    return {
      output,
      message: `Subscription **${output.subscriptionId}** is **${output.status ?? 'unknown'}**.`
    };
  })
  .build();

export const updateSubscription = SlateTool.create(spec, {
  name: 'Update Subscription',
  key: 'update_subscription',
  description:
    'Update selected subscription fields. Omitted fields are unchanged; null clears a supported value. Supply the current version from get_subscription.',
  instructions: ['Use get_subscription to obtain the current version before updating.']
})
  .scopes(
    allOf(
      'SUBSCRIPTIONS_WRITE',
      'ITEMS_READ',
      'CUSTOMERS_READ',
      'INVOICES_WRITE',
      'ORDERS_WRITE',
      'PAYMENTS_WRITE'
    )
  )
  .input(
    z.object({
      subscriptionId: z.string().min(1).describe('Subscription ID to update'),
      version: z
        .number()
        .int()
        .min(1)
        .describe('Current subscription version for concurrency protection'),
      cardId: z
        .string()
        .min(1)
        .nullable()
        .optional()
        .describe('Saved card ID, or null to clear the card'),
      canceledDate: z
        .null()
        .optional()
        .describe(
          'Set null to clear a previously scheduled cancellation date; Square does not allow changing it to another date'
        ),
      priceOverrideMoney: moneyInput
        .nullable()
        .optional()
        .describe('Static plan price override, or null to clear it'),
      taxPercentage: taxPercentageInput
        .nullable()
        .optional()
        .describe('Tax percentage, or null to clear it')
    })
  )
  .output(subscriptionOutput)
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, writeScopes);
    let { subscriptionId, version, cardId, canceledDate, priceOverrideMoney, taxPercentage } =
      ctx.input;
    if (
      [cardId, canceledDate, priceOverrideMoney, taxPercentage].every(
        value => value === undefined
      )
    ) {
      throw squareServiceError('Provide at least one subscription field to update.');
    }
    let response = await createClient(ctx.auth).request<{ subscription?: SquareSubscription }>(
      'PUT',
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
      {
        body: {
          subscription: {
            version,
            card_id: cardId,
            canceled_date: canceledDate,
            price_override_money: priceOverrideMoney,
            tax_percentage: taxPercentage
          }
        }
      }
    );
    let output = subscriptionFrom(response);
    return {
      output,
      message: `Subscription **${output.subscriptionId}** updated to version **${output.version ?? 'unknown'}**.`
    };
  })
  .build();

export const cancelSubscription = SlateTool.create(spec, {
  name: 'Cancel Subscription',
  key: 'cancel_subscription',
  description:
    'Schedule cancellation at the end of the active billing period. The subscription can remain ACTIVE until its canceled date.'
})
  .scopes(allOf('SUBSCRIPTIONS_WRITE'))
  .input(
    z.object({
      subscriptionId: z
        .string()
        .min(1)
        .describe('Subscription ID to schedule for cancellation')
    })
  )
  .output(subscriptionOutput)
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, ['SUBSCRIPTIONS_WRITE']);
    let response = await createClient(ctx.auth).request<{ subscription?: SquareSubscription }>(
      'POST',
      `/subscriptions/${encodeURIComponent(ctx.input.subscriptionId)}/cancel`
    );
    let output = subscriptionFrom(response);
    return {
      output,
      message: `Subscription **${output.subscriptionId}** is scheduled to cancel${output.canceledDate ? ` on **${output.canceledDate}**` : ' at the end of its billing period'}. Current status: **${output.status ?? 'unknown'}**.`
    };
  })
  .build();
