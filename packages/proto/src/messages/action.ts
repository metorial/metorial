import z from 'zod';
import { slatesAction } from '../types';
import { withRequestTraces } from './tracing';

/**
 * List Actions
 */
export let slatesMessageActionsListRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/actions.list'),
  id: z.string(),
  params: z.object({})
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
          content: z.union([
            z.object({
              type: z.literal('url'),
              url: z.string()
            }),
            z.object({
              type: z.literal('content'),
              encoding: z.union([z.literal('base64'), z.literal('utf-8')]),
              content: z.string()
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

/**
 * Poll Trigger Events
 */
export let slatesMessageActionTriggerEventsPollRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/action.trigger.poll_events'),
  id: z.string(),
  params: z.object({
    actionId: z.string(),
    state: z.any().nullable()
  })
});

export type SlatesMessageActionTriggerEventsPollRequest = z.infer<
  typeof slatesMessageActionTriggerEventsPollRequest
>;

export let slatesMessageActionTriggerEventsPollResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    inputs: z.array(z.record(z.string(), z.any())),
    updatedState: z.any().nullable().optional()
  })
});

export type SlatesMessageActionTriggerEventsPollResponse = z.infer<
  typeof slatesMessageActionTriggerEventsPollResponse
>;

/**
 * Handle Webhook Request
 */
export let slatesMessageActionTriggerWebhookHandleRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/action.trigger.webhook_handle'),
  id: z.string(),
  params: z.object({
    actionId: z.string(),
    url: z.string(),
    method: z.string(),
    headers: z.record(z.string(), z.string()),
    body: z
      .object({
        encoding: z.literal('base64'),
        content: z.string()
      })
      .nullable(),
    state: z.any().nullable()
  })
});

export type SlatesMessageActionTriggerWebhookHandleRequest = z.infer<
  typeof slatesMessageActionTriggerWebhookHandleRequest
>;

export let slatesMessageActionTriggerWebhookHandleResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    inputs: z.array(z.record(z.string(), z.any())),
    updatedState: z.any().nullable().optional()
  })
});

export type SlatesMessageActionTriggerWebhookHandleResponse = z.infer<
  typeof slatesMessageActionTriggerWebhookHandleResponse
>;

/**
 * Handle Webhook Registration
 */
export let slatesMessageActionTriggerWebhookRegisterRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/action.trigger.webhook_register'),
  id: z.string(),
  params: z.object({
    actionId: z.string(),
    webhookBaseUrl: z.string()
  })
});

export type SlatesMessageActionTriggerWebhookRegisterRequest = z.infer<
  typeof slatesMessageActionTriggerWebhookRegisterRequest
>;

export let slatesMessageActionTriggerWebhookRegisterResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    registrationDetails: z.any(),
    state: z.any().optional()
  })
});

export type SlatesMessageActionTriggerWebhookRegisterResponse = z.infer<
  typeof slatesMessageActionTriggerWebhookRegisterResponse
>;

/**
 * Handle Webhook Unregistration
 */
export let slatesMessageActionTriggerWebhookUnregisterRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/action.trigger.webhook_unregister'),
  id: z.string(),
  params: z.object({
    actionId: z.string(),
    webhookBaseUrl: z.string(),
    registrationDetails: z.any(),
    state: z.any().optional()
  })
});

export type SlatesMessageActionTriggerWebhookUnregisterRequest = z.infer<
  typeof slatesMessageActionTriggerWebhookUnregisterRequest
>;

export let slatesMessageActionTriggerWebhookUnregisterResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({})
});

export type SlatesMessageActionTriggerWebhookUnregisterResponse = z.infer<
  typeof slatesMessageActionTriggerWebhookUnregisterResponse
>;

export type SlatesActionRequests =
  | SlatesMessageActionsListRequest
  | SlatesMessageActionGetRequest
  | SlatesMessageActionInvokeRequest
  | SlatesMessageActionTriggerEventMapRequest
  | SlatesMessageActionTriggerEventsPollRequest
  | SlatesMessageActionTriggerWebhookHandleRequest
  | SlatesMessageActionTriggerWebhookRegisterRequest
  | SlatesMessageActionTriggerWebhookUnregisterRequest;

export type SlatesActionResponses =
  | SlatesMessageActionsListResponse
  | SlatesMessageActionGetResponse
  | SlatesMessageActionInvokeResponse
  | SlatesMessageActionTriggerEventMapResponse
  | SlatesMessageActionTriggerEventsPollResponse
  | SlatesMessageActionTriggerWebhookHandleResponse
  | SlatesMessageActionTriggerWebhookRegisterResponse
  | SlatesMessageActionTriggerWebhookUnregisterResponse;

export let slatesActionResponsesByMethod = {
  'slates/actions.list': slatesMessageActionsListResponse,
  'slates/action.get': slatesMessageActionGetResponse,
  'slates/action.tool.invoke': slatesMessageActionInvokeResponse,
  'slates/action.trigger.map_event': slatesMessageActionTriggerEventMapResponse,
  'slates/action.trigger.poll_events': slatesMessageActionTriggerEventsPollResponse,
  'slates/action.trigger.webhook_handle': slatesMessageActionTriggerWebhookHandleResponse,
  'slates/action.trigger.webhook_register': slatesMessageActionTriggerWebhookRegisterResponse,
  'slates/action.trigger.webhook_unregister':
    slatesMessageActionTriggerWebhookUnregisterResponse
};

export let slatesActionRequestsByMethod = {
  'slates/actions.list': slatesMessageActionsListRequest,
  'slates/action.get': slatesMessageActionGetRequest,
  'slates/action.tool.invoke': slatesMessageActionInvokeRequest,
  'slates/action.trigger.map_event': slatesMessageActionTriggerEventMapRequest,
  'slates/action.trigger.poll_events': slatesMessageActionTriggerEventsPollRequest,
  'slates/action.trigger.webhook_handle': slatesMessageActionTriggerWebhookHandleRequest,
  'slates/action.trigger.webhook_register': slatesMessageActionTriggerWebhookRegisterRequest,
  'slates/action.trigger.webhook_unregister':
    slatesMessageActionTriggerWebhookUnregisterRequest
};
