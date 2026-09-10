import z from 'zod';
import { slatesWebhookHttpResponse } from './action';
import { withRequestTraces } from './tracing';

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
    state: z.any().nullable(),
    registrationDetails: z.any().nullable().optional()
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
    updatedState: z.any().nullable().optional(),
    response: slatesWebhookHttpResponse.nullable().optional()
  })
});

export type SlatesMessageActionTriggerWebhookHandleResponse = z.infer<
  typeof slatesMessageActionTriggerWebhookHandleResponse
>;

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

export type SlatesLegacyTriggerRequests =
  | SlatesMessageActionTriggerEventsPollRequest
  | SlatesMessageActionTriggerWebhookHandleRequest
  | SlatesMessageActionTriggerWebhookRegisterRequest
  | SlatesMessageActionTriggerWebhookUnregisterRequest;

export type SlatesLegacyTriggerResponses =
  | SlatesMessageActionTriggerEventsPollResponse
  | SlatesMessageActionTriggerWebhookHandleResponse
  | SlatesMessageActionTriggerWebhookRegisterResponse
  | SlatesMessageActionTriggerWebhookUnregisterResponse;

export let slatesLegacyTriggerResponsesByMethod = {
  'slates/action.trigger.poll_events': slatesMessageActionTriggerEventsPollResponse,
  'slates/action.trigger.webhook_handle': slatesMessageActionTriggerWebhookHandleResponse,
  'slates/action.trigger.webhook_register': slatesMessageActionTriggerWebhookRegisterResponse,
  'slates/action.trigger.webhook_unregister':
    slatesMessageActionTriggerWebhookUnregisterResponse
};

export let slatesLegacyTriggerRequestsByMethod = {
  'slates/action.trigger.poll_events': slatesMessageActionTriggerEventsPollRequest,
  'slates/action.trigger.webhook_handle': slatesMessageActionTriggerWebhookHandleRequest,
  'slates/action.trigger.webhook_register': slatesMessageActionTriggerWebhookRegisterRequest,
  'slates/action.trigger.webhook_unregister':
    slatesMessageActionTriggerWebhookUnregisterRequest
};
