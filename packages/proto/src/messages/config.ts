import z from 'zod';
import { withRequestTraces } from './tracing';

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
    schema: z.record(z.string(), z.any()),
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
