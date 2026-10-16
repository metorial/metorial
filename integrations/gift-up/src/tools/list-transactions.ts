import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let transactionEvents = z.enum([
  'OrderPlaced',
  'GiftCardCreated',
  'CreditAdded',
  'Redeemed',
  'Expired',
  'Unexpired',
  'Voided',
  'Reactivated'
]);

let transactionResponseSchema = z
  .object({
    id: z.string().min(1),
    eventType: z.string().min(1),
    eventOccuredOn: z.string().min(1).optional(),
    eventOccurredOn: z.string().min(1).optional(),
    eventOccuredAtLocationId: z.string().nullable(),
    whoEmail: z.string().nullable(),
    whoName: z.string().nullable(),
    reason: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    giftCard: z
      .object({
        code: z.string().min(1),
        valueChange: z.number(),
        unitChange: z.number().int().nullable().optional()
      })
      .passthrough()
      .nullable()
  })
  .passthrough();

export type ReportTransaction = z.infer<typeof transactionResponseSchema>;

let transactionPageResponseSchema = z
  .object({
    transactions: z.array(z.unknown()).optional(),
    tranasctions: z.array(z.unknown()).optional(),
    total: z.number().int().min(0),
    hasMore: z.boolean()
  })
  .passthrough();

export let transactionOutputSchema = z
  .object({
    transactionId: z.string().describe('Transaction ID'),
    giftCardCode: z
      .string()
      .optional()
      .describe(
        'Associated gift card code; omitted for order-level events without a gift card'
      ),
    eventType: z.string().describe('Event type'),
    eventOccuredOn: z.string().describe('When the event occurred'),
    eventOccuredAtLocationId: z.string().nullable().describe('Location ID'),
    value: z
      .number()
      .optional()
      .describe(
        'Gift card currency value change; omitted for order-level events (see orderDetails)'
      ),
    units: z
      .number()
      .nullable()
      .optional()
      .describe('Gift card units change, when returned by the provider'),
    whoEmail: z.string().nullable().describe('Email of user who triggered the event'),
    whoName: z.string().nullable().describe('Name of user who triggered the event'),
    reason: z.string().nullable().describe('Reason logged with the event'),
    metadata: z
      .record(z.string(), z.string())
      .nullable()
      .describe(
        'Metadata values represented as strings; original values are available in raw'
      ),
    raw: z
      .record(z.string(), z.unknown())
      .describe(
        'Complete original transaction, including financial details and unmodified metadata'
      )
  })
  .passthrough();

export let mapTransaction = (transaction: unknown) => {
  let parsed = transactionResponseSchema.safeParse(transaction);
  if (!parsed.success) {
    let paths = parsed.error.issues.map(issue => issue.path.join('.')).join(', ');
    throw createApiServiceError(`Gift Up! returned malformed transaction data at: ${paths}.`);
  }
  let source = parsed.data;
  let eventOccuredOn = source.eventOccuredOn ?? source.eventOccurredOn;
  if (!eventOccuredOn) {
    throw createApiServiceError(
      'Gift Up! returned a transaction without an occurrence timestamp.'
    );
  }
  if (source.giftCard === null && source.eventType !== 'OrderPlaced') {
    throw createApiServiceError(
      'Gift Up! returned a non-order transaction without its required giftCard object.'
    );
  }
  let metadata =
    source.metadata === null
      ? null
      : Object.fromEntries(
          Object.entries(source.metadata).map(([key, value]) => {
            let serialized = typeof value === 'string' ? value : JSON.stringify(value);
            if (serialized === undefined) {
              throw createApiServiceError(
                `Gift Up! returned a non-JSON metadata value at metadata.${key}.`
              );
            }
            return [key, serialized];
          })
        );
  return {
    ...source,
    transactionId: source.id,
    eventOccuredOn,
    ...(source.giftCard === null
      ? {}
      : {
          giftCardCode: source.giftCard.code,
          value: source.giftCard.valueChange,
          ...(source.giftCard.unitChange === undefined
            ? {}
            : { units: source.giftCard.unitChange })
        }),
    metadata,
    raw: source
  };
};

export let listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description:
    'Retrieve financial transactions for orders and gift cards. Filter by occurrence dates, events, user emails, gift card code, and locations. Returns full financial details and pagination state.',
  tags: { readOnly: true },
  constraints: ['Maximum 100 results per page']
})
  .input(
    z.object({
      createdOnOrAfter: z
        .string()
        .optional()
        .describe(
          'Unsupported legacy creation-date filter. Use eventOccurredOnOrAfter instead; transaction reports expose occurrence dates.'
        ),
      updatedOnOrAfter: z
        .string()
        .optional()
        .describe(
          'Unsupported legacy update-date filter. Transactions are immutable; use occurrence-date filters instead.'
        ),
      eventOccurredOnOrAfter: z
        .string()
        .optional()
        .describe('Include transactions occurring at or after this date (UTC)'),
      eventOccurredOnOrBefore: z
        .string()
        .optional()
        .describe('Include transactions occurring at or before this date (UTC)'),
      giftCardCode: z.string().optional().describe('Filter by gift card code'),
      eventType: transactionEvents
        .optional()
        .describe(
          'Filter by one event type; combine with events to include additional event types'
        ),
      events: z
        .array(transactionEvents)
        .optional()
        .describe('Event types to include (matches any supplied type)'),
      users: z
        .array(z.string())
        .optional()
        .describe('Filter by the email addresses of users who generated events'),
      locationId: z
        .string()
        .optional()
        .describe('Filter by location ID. Call list_locations for IDs.'),
      locations: z
        .array(z.string())
        .optional()
        .describe('Additional location IDs to include. Call list_locations for IDs.'),
      limit: z.number().optional().default(10).describe('Results per page (1 to 100)'),
      offset: z.number().optional().default(0).describe('Number of results to skip')
    })
  )
  .output(
    z
      .object({
        transactions: z.array(transactionOutputSchema),
        total: z.number().describe('Total matching transactions'),
        hasMore: z.boolean().describe('Whether more results are available')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    if (ctx.input.createdOnOrAfter !== undefined || ctx.input.updatedOnOrAfter !== undefined) {
      throw createApiServiceError(
        'Gift Up! transaction reports have no creation/update-date filters. Remove createdOnOrAfter and updatedOnOrAfter; use eventOccurredOnOrAfter and eventOccurredOnOrBefore for occurrence dates.'
      );
    }
    if (
      !Number.isInteger(ctx.input.limit) ||
      ctx.input.limit < 1 ||
      ctx.input.limit > 100 ||
      !Number.isInteger(ctx.input.offset) ||
      ctx.input.offset < 0
    ) {
      throw createApiServiceError(
        'limit must be an integer from 1 to 100 and offset a nonnegative integer.'
      );
    }
    let client = new Client({ token: ctx.auth.token, testMode: ctx.config.testMode });
    let events = [
      ...new Set([
        ...(ctx.input.events ?? []),
        ...(ctx.input.eventType ? [ctx.input.eventType] : [])
      ])
    ];
    let locations = [
      ...new Set([
        ...(ctx.input.locations ?? []),
        ...(ctx.input.locationId ? [ctx.input.locationId] : [])
      ])
    ];
    let result = await client.listTransactions({
      eventOccurredOnOrAfter: ctx.input.eventOccurredOnOrAfter,
      eventOccurredOnOrBefore: ctx.input.eventOccurredOnOrBefore,
      code: ctx.input.giftCardCode,
      events: events.length > 0 ? events : undefined,
      users: ctx.input.users,
      locations: locations.length > 0 ? locations : undefined,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    let parsed = transactionPageResponseSchema.safeParse(result);
    if (!parsed.success) {
      let paths = parsed.error.issues.map(issue => issue.path.join('.')).join(', ');
      throw createApiServiceError(
        `Gift Up! returned malformed transaction-list data at: ${paths}.`
      );
    }
    // The reference's example misspells this envelope; accept either documented spelling.
    let sourceTransactions = parsed.data.transactions ?? parsed.data.tranasctions;
    if (sourceTransactions === undefined) {
      throw createApiServiceError(
        'Gift Up! returned a transaction list without its transactions array.'
      );
    }
    let transactions = sourceTransactions.map(mapTransaction);
    return {
      output: { ...result, transactions },
      message: `Found **${result.total}** transactions (showing ${transactions.length})${result.hasMore ? ' — more results available' : ''}`
    };
  })
  .build();
