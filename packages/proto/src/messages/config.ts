import { createHash } from 'node:crypto';
import z from 'zod';
import { withRequestTraces } from './tracing';

export let canonicalSlateConfigJson = (value: unknown): string => {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new Error('Config schema cannot contain non-finite numbers');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalSlateConfigJson).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        key =>
          `${JSON.stringify(key)}:${canonicalSlateConfigJson((value as Record<string, unknown>)[key])}`
      )
      .join(',')}}`;
  }
  throw new Error('Config schema contains a non-JSON value');
};

export let computeSlateConfigSchemaV2Hash = (schema: {
  version: 2;
  fieldOrder: readonly string[];
  fields: Readonly<Record<string, unknown>>;
  jsonSchema: Readonly<Record<string, unknown>>;
}) =>
  createHash('sha256')
    .update(
      canonicalSlateConfigJson({
        version: schema.version,
        fieldOrder: schema.fieldOrder,
        fields: schema.fields,
        jsonSchema: schema.jsonSchema
      })
    )
    .digest('hex');

export let slateConfigFieldVisibility = z.enum(['plain', 'secret']);
export let slateConfigFieldLifecycle = z.enum(['none', 'projection', 'reregister', 'renew']);
export let slateConfigFieldDescriptorWireV2 = z.strictObject({
  visibility: slateConfigFieldVisibility,
  lifecycle: slateConfigFieldLifecycle
});
export let slateConfigSchemaWireV2 = z
  .strictObject({
    version: z.literal(2),
    hash: z.string().regex(/^[a-f0-9]{64}$/),
    fieldOrder: z.array(z.string()),
    fields: z.record(z.string(), slateConfigFieldDescriptorWireV2),
    jsonSchema: z.record(z.string(), z.any())
  })
  .superRefine((value, ctx) => {
    let keys = Object.keys(value.fields).sort();
    if (new Set(value.fieldOrder).size !== value.fieldOrder.length) {
      ctx.addIssue({ code: 'custom', message: 'Config field order contains duplicates' });
    }
    if (JSON.stringify(value.fieldOrder) !== JSON.stringify(keys)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Config field order must be the canonical sorted field key set'
      });
    }
    if (value.hash !== computeSlateConfigSchemaV2Hash(value)) {
      ctx.addIssue({ code: 'custom', message: 'Config schema hash is not canonical' });
    }
  });

export let slateConfigSchemaWireV1 = z.strictObject({
  version: z.literal(1),
  jsonSchema: z.record(z.string(), z.any()),
  compatibility: z.strictObject({
    integrationId: z.enum(['looker', 'tableau']),
    owner: z.string().min(1),
    expiresAt: z.string().datetime(),
    cutoffAt: z.string().datetime()
  })
});

export let slateConfigSchemaWire = z.discriminatedUnion('version', [
  slateConfigSchemaWireV1,
  slateConfigSchemaWireV2
]);

export type SlateConfigSchemaWireV2 = z.infer<typeof slateConfigSchemaWireV2>;
export type SlateConfigSchemaWireV1 = z.infer<typeof slateConfigSchemaWireV1>;
export type SlateConfigSchemaWire = z.infer<typeof slateConfigSchemaWire>;

/**
 * Set Config
 */
export let slatesMessageSetConfigNotification = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/config.set'),
  params: z.object({
    config: z.record(z.string(), z.any())
  })
});

export type SlatesMessageSetConfigNotification = z.infer<
  typeof slatesMessageSetConfigNotification
>;

/**
 * Get Config Schema
 */
export let slatesMessageConfigSchemaGetRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/config.schema.get'),
  id: z.string(),
  params: z.object({})
});

export type SlatesMessageConfigSchemaGetRequest = z.infer<
  typeof slatesMessageConfigSchemaGetRequest
>;

export let slatesMessageConfigSchemaGetResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: z.object({
    schema: slateConfigSchemaWire,
    docs: z.array(
      z.object({
        type: z.literal('docs.config.general').optional(),
        name: z.string(),
        url: z.string()
      })
    )
  })
});

export type SlatesMessageConfigSchemaGetResponse = z.infer<
  typeof slatesMessageConfigSchemaGetResponse
>;

/**
 * Config Changed
 */
export let slatesMessageConfigChangedRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/config.changed'),
  id: z.string(),
  params: z.object({
    previousConfig: z.record(z.string(), z.any()).nullable(),
    newConfig: z.record(z.string(), z.any())
  })
});

export type SlatesMessageConfigChangedRequest = z.infer<
  typeof slatesMessageConfigChangedRequest
>;

export let slatesMessageConfigChangedResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    success: z.boolean(),
    config: z.record(z.string(), z.any()).optional(),
    errors: z
      .array(
        z.object({
          code: z.string(),
          message: z.string(),
          path: z.array(z.string()).optional()
        })
      )
      .optional()
  })
});

export type SlatesMessageConfigChangedResponse = z.infer<
  typeof slatesMessageConfigChangedResponse
>;

/**
 * Get Default Config
 */
export let slatesMessageConfigDefaultGetRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/config.get_default'),
  id: z.string(),
  params: z.object({})
});

export type SlatesMessageConfigDefaultGetRequest = z.infer<
  typeof slatesMessageConfigDefaultGetRequest
>;

export let slatesMessageConfigDefaultGetResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    config: z.record(z.string(), z.any()).nullable()
  })
});

export type SlatesMessageConfigDefaultGetResponse = z.infer<
  typeof slatesMessageConfigDefaultGetResponse
>;

export type SlatesConfigRequests =
  | SlatesMessageConfigSchemaGetRequest
  | SlatesMessageConfigDefaultGetRequest
  | SlatesMessageConfigChangedRequest;

export type SlatesConfigResponses =
  | SlatesMessageConfigSchemaGetResponse
  | SlatesMessageConfigDefaultGetResponse
  | SlatesMessageConfigChangedResponse;

export type SlatesConfigNotifications = SlatesMessageSetConfigNotification;

export let slatesConfigResponsesByMethod = {
  'slates/config.schema.get': slatesMessageConfigSchemaGetResponse,
  'slates/config.get_default': slatesMessageConfigDefaultGetResponse,
  'slates/config.changed': slatesMessageConfigChangedResponse
};

export let slatesConfigRequestsByMethod = {
  'slates/config.schema.get': slatesMessageConfigSchemaGetRequest,
  'slates/config.get_default': slatesMessageConfigDefaultGetRequest,
  'slates/config.changed': slatesMessageConfigChangedRequest
};

export let slatesConfigNotificationsByMethod = {
  'slates/config.set': slatesMessageSetConfigNotification
};
