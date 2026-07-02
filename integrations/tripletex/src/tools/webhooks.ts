import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { tripletexValidationError } from '../lib/errors';
import { spec } from '../spec';
import {
  asNumber,
  asRecord,
  asString,
  commonParams,
  companyIdFor,
  createClient,
  listMetadataSchema,
  listOutput,
  pagingInputShape,
  rawRecordSchema
} from './shared';

let subscriptionStatusSchema = z.enum([
  'ACTIVE',
  'DISABLED',
  'DISABLED_TOO_MANY_ERRORS',
  'DISABLED_RATE_LIMIT_EXCEEDED',
  'DISABLED_MISUSE'
]);

let subscriptionSchema = z.object({
  id: z.number().optional(),
  version: z.number().optional(),
  event: z.string().optional(),
  targetUrl: z.string().optional(),
  fields: z.string().optional(),
  status: z.string().optional(),
  authHeaderName: z.string().optional(),
  raw: rawRecordSchema
});

let mapSubscription = (value: unknown): z.infer<typeof subscriptionSchema> => {
  let record = asRecord(value);
  return {
    id: asNumber(record.id),
    version: asNumber(record.version),
    event: asString(record.event),
    targetUrl: asString(record.targetUrl),
    fields: asString(record.fields),
    status: asString(record.status),
    authHeaderName: asString(record.authHeaderName),
    raw: record
  };
};

let requireHttpsUrl = (url: string | undefined, operation: string) => {
  if (!url) {
    throw tripletexValidationError(`targetUrl is required for ${operation}.`);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw tripletexValidationError('targetUrl must be an absolute HTTPS URL.');
  }

  if (parsed.protocol !== 'https:') {
    throw tripletexValidationError('targetUrl must be an absolute HTTPS URL.');
  }

  return url;
};

let requireSubscriptionId = (id: number | undefined, operation: string) => {
  if (id === undefined) {
    throw tripletexValidationError(`subscriptionId is required for ${operation}.`);
  }
  return id;
};

let subscriptionBody = (input: {
  subscriptionId?: number;
  version?: number;
  event?: string;
  targetUrl?: string;
  fields?: string;
  status?: z.infer<typeof subscriptionStatusSchema>;
  authHeaderName?: string;
  authHeaderValue?: string;
  hmacSharedSecret?: string;
}) =>
  pickDefined({
    id: input.subscriptionId,
    version: input.version,
    event: input.event,
    targetUrl: input.targetUrl,
    fields: input.fields,
    status: input.status,
    authHeaderName: input.authHeaderName,
    authHeaderValue: input.authHeaderValue,
    hmacSharedSecret: input.hmacSharedSecret
  });

let ensureAllowedFields = (
  input: Record<string, unknown>,
  operation: string,
  allowed: Set<string>
) => {
  for (let [key, value] of Object.entries(input)) {
    if (value !== undefined && !allowed.has(key)) {
      throw tripletexValidationError(`${key} is not supported for ${operation}.`);
    }
  }
};

let allowedFieldsByOperation = {
  list_events: new Set(['operation', 'fields', 'companyId']),
  list: new Set(['operation', 'from', 'count', 'sorting', 'fields', 'companyId']),
  get: new Set(['operation', 'subscriptionId', 'fields', 'companyId']),
  create: new Set([
    'operation',
    'event',
    'targetUrl',
    'fields',
    'authHeaderName',
    'authHeaderValue',
    'hmacSharedSecret',
    'companyId'
  ]),
  update: new Set([
    'operation',
    'subscriptionId',
    'version',
    'event',
    'targetUrl',
    'fields',
    'status',
    'authHeaderName',
    'authHeaderValue',
    'hmacSharedSecret',
    'companyId'
  ]),
  delete: new Set(['operation', 'subscriptionId', 'companyId'])
};

let ensureWebhookHeaderPair = (input: {
  authHeaderName?: string;
  authHeaderValue?: string;
}) => {
  if (input.authHeaderValue !== undefined && !input.authHeaderName?.trim()) {
    throw tripletexValidationError(
      'authHeaderName is required when authHeaderValue is provided.'
    );
  }
};

let ensureUpdateFields = (input: {
  event?: string;
  targetUrl?: string;
  fields?: string;
  status?: z.infer<typeof subscriptionStatusSchema>;
  authHeaderName?: string;
  authHeaderValue?: string;
  hmacSharedSecret?: string;
}) => {
  if (
    input.event === undefined &&
    input.targetUrl === undefined &&
    input.fields === undefined &&
    input.status === undefined &&
    input.authHeaderName === undefined &&
    input.authHeaderValue === undefined &&
    input.hmacSharedSecret === undefined
  ) {
    throw tripletexValidationError(
      'At least one subscription field must be provided for update.'
    );
  }
};

export let manageWebhookSubscription = SlateTool.create(spec, {
  name: 'Manage Webhook Subscription',
  key: 'manage_webhook_subscription',
  description:
    'List Tripletex webhook event keys or list, get, create, update, and delete Tripletex webhook subscriptions. Subscription endpoints are beta in the Tripletex API.',
  instructions: [
    'Use operation list_events to discover event keys.',
    'Use operation create with event and targetUrl.',
    'Use operation update with subscriptionId and any fields to change.',
    'Use operation delete with subscriptionId.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum(['list_events', 'list', 'get', 'create', 'update', 'delete'])
        .describe('Webhook operation to perform'),
      subscriptionId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Required for get, update, and delete operations'),
      version: z
        .number()
        .int()
        .optional()
        .describe('Tripletex subscription version for update operations'),
      event: z
        .string()
        .optional()
        .describe('Tripletex event key such as customer.create; required for create'),
      targetUrl: z
        .string()
        .optional()
        .describe('HTTPS webhook callback URL required for create and optional for update'),
      fields: z
        .string()
        .optional()
        .describe('Tripletex fields pattern for event payload or read/list fields'),
      status: subscriptionStatusSchema.optional().describe('Subscription status for update'),
      authHeaderName: z.string().optional().describe('Custom auth header name'),
      authHeaderValue: z
        .string()
        .optional()
        .describe('Custom auth header value. Write-only and not returned by Tripletex.'),
      hmacSharedSecret: z
        .string()
        .optional()
        .describe('HMAC signing shared secret. Write-only and not returned by Tripletex.'),
      from: pagingInputShape.from,
      count: pagingInputShape.count,
      sorting: pagingInputShape.sorting,
      companyId: pagingInputShape.companyId
    })
  )
  .output(
    z.object({
      events: z.record(z.string(), z.any()).optional(),
      subscriptions: z.array(subscriptionSchema).optional(),
      subscription: subscriptionSchema.optional(),
      deleted: z.boolean().optional(),
      ...listMetadataSchema
    })
  )
  .handleInvocation(async ctx => {
    ensureAllowedFields(
      ctx.input,
      ctx.input.operation,
      allowedFieldsByOperation[ctx.input.operation]
    );

    let client = createClient(ctx);
    let companyId = companyIdFor(ctx, ctx.input.companyId);

    if (ctx.input.operation === 'list_events') {
      let events = asRecord(
        await client.getValue('/event', { fields: ctx.input.fields }, companyId)
      );
      return {
        output: { events },
        message: `Retrieved **${Object.keys(events).length}** Tripletex webhook event key(s).`
      };
    }

    if (ctx.input.operation === 'list') {
      let response = await client.list(
        '/event/subscription',
        commonParams({
          from: ctx.input.from,
          count: ctx.input.count,
          sorting: ctx.input.sorting,
          fields: ctx.input.fields
        }),
        companyId
      );
      let subscriptions = (response.values ?? []).map(mapSubscription);
      return {
        output: { subscriptions, ...listOutput(response) },
        message: `Found **${subscriptions.length}** Tripletex webhook subscription(s).`
      };
    }

    if (ctx.input.operation === 'get') {
      let id = requireSubscriptionId(ctx.input.subscriptionId, 'get');
      let subscription = mapSubscription(
        await client.getValue(
          `/event/subscription/${id}`,
          { fields: ctx.input.fields },
          companyId
        )
      );
      return {
        output: { subscription },
        message: `Retrieved Tripletex webhook subscription **${id}**.`
      };
    }

    if (ctx.input.operation === 'delete') {
      let id = requireSubscriptionId(ctx.input.subscriptionId, 'delete');
      await client.delete(`/event/subscription/${id}`, companyId);
      return {
        output: {
          subscription: { id, raw: { id } },
          deleted: true
        },
        message: `Deleted Tripletex webhook subscription **${id}**.`
      };
    }

    if (ctx.input.operation === 'create') {
      if (!ctx.input.event) {
        throw tripletexValidationError('event is required for create.');
      }
      ensureWebhookHeaderPair(ctx.input);
      let targetUrl = requireHttpsUrl(ctx.input.targetUrl, 'create');
      let subscription = mapSubscription(
        await client.createValue(
          '/event/subscription',
          subscriptionBody({ ...ctx.input, targetUrl }),
          {},
          companyId
        )
      );
      return {
        output: { subscription },
        message: `Created Tripletex webhook subscription for **${ctx.input.event}**.`
      };
    }

    let id = requireSubscriptionId(ctx.input.subscriptionId, 'update');
    ensureUpdateFields(ctx.input);
    ensureWebhookHeaderPair(ctx.input);
    if (ctx.input.targetUrl) requireHttpsUrl(ctx.input.targetUrl, 'update');
    let subscription = mapSubscription(
      await client.updateValue(
        `/event/subscription/${id}`,
        subscriptionBody(ctx.input),
        {},
        companyId
      )
    );
    return {
      output: { subscription },
      message: `Updated Tripletex webhook subscription **${id}**.`
    };
  })
  .build();
