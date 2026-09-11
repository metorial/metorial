import z from 'zod';
import { slatesAction } from '../types';
import { withRequestTraces } from './tracing';

export let slatesWebhookHttpResponse = z.object({
  status: z.number().int().min(100).max(599),
  headers: z.record(z.string(), z.string()),
  body: z
    .object({
      encoding: z.literal('base64'),
      content: z.string()
    })
    .nullable()
});

export type SlatesWebhookHttpResponse = z.infer<typeof slatesWebhookHttpResponse>;

/**
 * List Actions
 */
export let slatesMessageActionsListRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/actions.list'),
  id: z.string(),
  params: z.object({
    includeAdapterActions: z.optional(z.nullable(z.boolean()))
  })
});

export type SlatesMessageActionsListRequest = z.infer<typeof slatesMessageActionsListRequest>;

export let slatesMessageActionsListResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: z.object({
    actions: z.array(slatesAction)
  })
});

export type SlatesMessageActionsListResponse = z.infer<
  typeof slatesMessageActionsListResponse
>;

/**
 * Get Action
 */
export let slatesMessageActionGetRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/action.get'),
  id: z.string(),
  params: z.object({
    actionId: z.string()
  })
});

export type SlatesMessageActionGetRequest = z.infer<typeof slatesMessageActionGetRequest>;

export let slatesMessageActionGetResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: z.object({
    action: slatesAction
  })
});

export type SlatesMessageActionGetResponse = z.infer<typeof slatesMessageActionGetResponse>;

/**
 * Invoke Action
 */
export let slatesMessageActionInvokeRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/action.tool.invoke'),
  id: z.string(),
  params: z.object({
    actionId: z.string(),
    input: z.record(z.string(), z.any())
  })
});

export type SlatesMessageActionInvokeRequest = z.infer<
  typeof slatesMessageActionInvokeRequest
>;

export let slatesMessageActionInvokeResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    output: z.record(z.string(), z.any()),
    message: z.string().optional(),
    attachments: z
      .array(
        z.object({
          mimeType: z.string().optional(),
          attachmentHash: z.string().optional(),
          content: z.union([
            z.object({
              type: z.literal('url'),
              url: z.string(),
              headers: z.record(z.string(), z.string()).optional(),
              query: z.record(z.string(), z.string()).optional(),
              refreshReference: z.unknown().optional(),
              refreshAt: z.string().optional()
            }),
            z.object({
              type: z.literal('content'),
              encoding: z.union([z.literal('base64'), z.literal('utf-8')]),
              content: z.string()
            }),
            z.object({
              type: z.literal('upload_reference'),
              referenceId: z.string()
            })
          ])
        })
      )
      .optional()
  })
});

export type SlatesMessageActionInvokeResponse = z.infer<
  typeof slatesMessageActionInvokeResponse
>;

/**
 * Map Trigger Event
 */
export let slatesMessageActionTriggerEventMapRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/action.trigger.map_event'),
  id: z.string(),
  params: z.object({
    actionId: z.string(),
    input: z.record(z.string(), z.any())
  })
});

export type SlatesMessageActionTriggerEventMapRequest = z.infer<
  typeof slatesMessageActionTriggerEventMapRequest
>;

export let slatesMessageActionTriggerEventMapResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    type: z.string(),
    id: z.string(),
    output: z.record(z.string(), z.any())
  })
});

export type SlatesMessageActionTriggerEventMapResponse = z.infer<
  typeof slatesMessageActionTriggerEventMapResponse
>;

export type SlatesActionRequests =
  | SlatesMessageActionsListRequest
  | SlatesMessageActionGetRequest
  | SlatesMessageActionInvokeRequest
  | SlatesMessageActionTriggerEventMapRequest;

export type SlatesActionResponses =
  | SlatesMessageActionsListResponse
  | SlatesMessageActionGetResponse
  | SlatesMessageActionInvokeResponse
  | SlatesMessageActionTriggerEventMapResponse;

export let slatesActionResponsesByMethod = {
  'slates/actions.list': slatesMessageActionsListResponse,
  'slates/action.get': slatesMessageActionGetResponse,
  'slates/action.tool.invoke': slatesMessageActionInvokeResponse,
  'slates/action.trigger.map_event': slatesMessageActionTriggerEventMapResponse
};

export let slatesActionRequestsByMethod = {
  'slates/actions.list': slatesMessageActionsListRequest,
  'slates/action.get': slatesMessageActionGetRequest,
  'slates/action.tool.invoke': slatesMessageActionInvokeRequest,
  'slates/action.trigger.map_event': slatesMessageActionTriggerEventMapRequest
};
