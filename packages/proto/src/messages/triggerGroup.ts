import z from 'zod';
import { slatesTriggerGroup, slatesTriggerRoutingMatcher, slatesWebhookTarget } from '../types';
import { slatesWebhookHttpResponse } from './action';
import { withRequestTraces } from './tracing';

let slatesTriggerGroupWebhookEvent = z.object({
  matchers: z.array(slatesTriggerRoutingMatcher),
  payload: z.record(z.string(), z.any()),
  idempotencyKey: z.string().optional(),
  triggerIds: z.array(z.string())
});

let slatesTriggerGroupPollEvent = z.object({
  payload: z.record(z.string(), z.any()),
  idempotencyKey: z.string().optional(),
  triggerIds: z.array(z.string())
});

/**
 * List Trigger Groups
 */
export let slatesMessageTriggerGroupsListRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/trigger_groups.list'),
  id: z.string(),
  params: z.object({})
});

export type SlatesMessageTriggerGroupsListRequest = z.infer<
  typeof slatesMessageTriggerGroupsListRequest
>;

export let slatesMessageTriggerGroupsListResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: z.object({
    triggerGroups: z.array(slatesTriggerGroup)
  })
});

export type SlatesMessageTriggerGroupsListResponse = z.infer<
  typeof slatesMessageTriggerGroupsListResponse
>;

/**
 * Get Trigger Group
 */
export let slatesMessageTriggerGroupGetRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/trigger_group.get'),
  id: z.string(),
  params: z.object({
    triggerGroupId: z.string()
  })
});

export type SlatesMessageTriggerGroupGetRequest = z.infer<
  typeof slatesMessageTriggerGroupGetRequest
>;

export let slatesMessageTriggerGroupGetResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: z.object({
    triggerGroup: slatesTriggerGroup
  })
});

export type SlatesMessageTriggerGroupGetResponse = z.infer<
  typeof slatesMessageTriggerGroupGetResponse
>;

/**
 * List Webhook Targets
 */
export let slatesMessageTriggerGroupWebhookTargetsListRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/trigger_group.webhook.targets_list'),
  id: z.string(),
  params: z.object({
    triggerGroupId: z.string(),
    pageToken: z.any().nullable().optional()
  })
});

export type SlatesMessageTriggerGroupWebhookTargetsListRequest = z.infer<
  typeof slatesMessageTriggerGroupWebhookTargetsListRequest
>;

export let slatesMessageTriggerGroupWebhookTargetsListResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    resources: z.array(slatesWebhookTarget),
    nextPageToken: z.any().nullable()
  })
});

export type SlatesMessageTriggerGroupWebhookTargetsListResponse = z.infer<
  typeof slatesMessageTriggerGroupWebhookTargetsListResponse
>;

/**
 * Register Webhook
 */
export let slatesMessageTriggerGroupWebhookRegisterRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/trigger_group.webhook.register'),
  id: z.string(),
  params: z.object({
    triggerGroupId: z.string(),
    webhookTargetIdentifier: z.string(),
    webhookTargetPayload: z.any(),
    webhookUrl: z.string()
  })
});

export type SlatesMessageTriggerGroupWebhookRegisterRequest = z.infer<
  typeof slatesMessageTriggerGroupWebhookRegisterRequest
>;

export let slatesMessageTriggerGroupWebhookRegisterResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    webhookRegistrationIdentifier: z.string(),
    webhookRegistrationPayload: z.any()
  })
});

export type SlatesMessageTriggerGroupWebhookRegisterResponse = z.infer<
  typeof slatesMessageTriggerGroupWebhookRegisterResponse
>;

/**
 * Unregister Webhook
 */
export let slatesMessageTriggerGroupWebhookUnregisterRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/trigger_group.webhook.unregister'),
  id: z.string(),
  params: z.object({
    triggerGroupId: z.string(),
    webhookRegistrationIdentifier: z.string(),
    webhookRegistrationPayload: z.any()
  })
});

export type SlatesMessageTriggerGroupWebhookUnregisterRequest = z.infer<
  typeof slatesMessageTriggerGroupWebhookUnregisterRequest
>;

export let slatesMessageTriggerGroupWebhookUnregisterResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({})
});

export type SlatesMessageTriggerGroupWebhookUnregisterResponse = z.infer<
  typeof slatesMessageTriggerGroupWebhookUnregisterResponse
>;

/**
 * Manual Webhook Setup
 */
export let slatesMessageTriggerGroupWebhookManualSetupRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/trigger_group.webhook.manual_setup'),
  id: z.string(),
  params: z.object({
    triggerGroupId: z.string(),
    webhookUrl: z.string()
  })
});

export type SlatesMessageTriggerGroupWebhookManualSetupRequest = z.infer<
  typeof slatesMessageTriggerGroupWebhookManualSetupRequest
>;

export let slatesMessageTriggerGroupWebhookManualSetupResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: z.object({
    webhookSetupDocument: z.string(),
    partialWebhookRegistrationPayload: z.any()
  })
});

export type SlatesMessageTriggerGroupWebhookManualSetupResponse = z.infer<
  typeof slatesMessageTriggerGroupWebhookManualSetupResponse
>;

/**
 * Manual Webhook Finish
 */
export let slatesMessageTriggerGroupWebhookManualFinishRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/trigger_group.webhook.manual_finish'),
  id: z.string(),
  params: z.object({
    triggerGroupId: z.string(),
    webhookUrl: z.string(),
    partialWebhookRegistrationPayload: z.any(),
    userWebhookRegistrationPayload: z.any()
  })
});

export type SlatesMessageTriggerGroupWebhookManualFinishRequest = z.infer<
  typeof slatesMessageTriggerGroupWebhookManualFinishRequest
>;

export let slatesMessageTriggerGroupWebhookManualFinishResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    webhookRegistrationPayload: z.any()
  })
});

export type SlatesMessageTriggerGroupWebhookManualFinishResponse = z.infer<
  typeof slatesMessageTriggerGroupWebhookManualFinishResponse
>;

/**
 * Process Webhook Request
 */
export let slatesMessageTriggerGroupWebhookProcessRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/trigger_group.webhook.process'),
  id: z.string(),
  params: z.object({
    triggerGroupId: z.string(),
    url: z.string(),
    method: z.string(),
    headers: z.record(z.string(), z.string()),
    body: z
      .object({
        encoding: z.literal('base64'),
        content: z.string()
      })
      .nullable(),
    webhookRegistrationPayload: z.any()
  })
});

export type SlatesMessageTriggerGroupWebhookProcessRequest = z.infer<
  typeof slatesMessageTriggerGroupWebhookProcessRequest
>;

export let slatesMessageTriggerGroupWebhookProcessResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    events: z.array(slatesTriggerGroupWebhookEvent),
    response: slatesWebhookHttpResponse.nullable().optional()
  })
});

export type SlatesMessageTriggerGroupWebhookProcessResponse = z.infer<
  typeof slatesMessageTriggerGroupWebhookProcessResponse
>;

/**
 * Get Routing Matchers
 */
export let slatesMessageTriggerGroupRoutingMatchersGetRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/trigger_group.routing_matchers.get'),
  id: z.string(),
  params: z.object({
    triggerGroupId: z.string()
  })
});

export type SlatesMessageTriggerGroupRoutingMatchersGetRequest = z.infer<
  typeof slatesMessageTriggerGroupRoutingMatchersGetRequest
>;

export let slatesMessageTriggerGroupRoutingMatchersGetResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    matchers: z.array(slatesTriggerRoutingMatcher)
  })
});

export type SlatesMessageTriggerGroupRoutingMatchersGetResponse = z.infer<
  typeof slatesMessageTriggerGroupRoutingMatchersGetResponse
>;

/**
 * Poll
 */
export let slatesMessageTriggerGroupPollingPollRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/trigger_group.polling.poll'),
  id: z.string(),
  params: z.object({
    triggerGroupId: z.string(),
    state: z.any().nullable()
  })
});

export type SlatesMessageTriggerGroupPollingPollRequest = z.infer<
  typeof slatesMessageTriggerGroupPollingPollRequest
>;

export let slatesMessageTriggerGroupPollingPollResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    updatedState: z.any().nullable().optional(),
    events: z.array(slatesTriggerGroupPollEvent)
  })
});

export type SlatesMessageTriggerGroupPollingPollResponse = z.infer<
  typeof slatesMessageTriggerGroupPollingPollResponse
>;

export type SlatesTriggerGroupRequests =
  | SlatesMessageTriggerGroupsListRequest
  | SlatesMessageTriggerGroupGetRequest
  | SlatesMessageTriggerGroupWebhookTargetsListRequest
  | SlatesMessageTriggerGroupWebhookRegisterRequest
  | SlatesMessageTriggerGroupWebhookUnregisterRequest
  | SlatesMessageTriggerGroupWebhookManualSetupRequest
  | SlatesMessageTriggerGroupWebhookManualFinishRequest
  | SlatesMessageTriggerGroupWebhookProcessRequest
  | SlatesMessageTriggerGroupRoutingMatchersGetRequest
  | SlatesMessageTriggerGroupPollingPollRequest;

export type SlatesTriggerGroupResponses =
  | SlatesMessageTriggerGroupsListResponse
  | SlatesMessageTriggerGroupGetResponse
  | SlatesMessageTriggerGroupWebhookTargetsListResponse
  | SlatesMessageTriggerGroupWebhookRegisterResponse
  | SlatesMessageTriggerGroupWebhookUnregisterResponse
  | SlatesMessageTriggerGroupWebhookManualSetupResponse
  | SlatesMessageTriggerGroupWebhookManualFinishResponse
  | SlatesMessageTriggerGroupWebhookProcessResponse
  | SlatesMessageTriggerGroupRoutingMatchersGetResponse
  | SlatesMessageTriggerGroupPollingPollResponse;

export let slatesTriggerGroupResponsesByMethod = {
  'slates/trigger_groups.list': slatesMessageTriggerGroupsListResponse,
  'slates/trigger_group.get': slatesMessageTriggerGroupGetResponse,
  'slates/trigger_group.webhook.targets_list':
    slatesMessageTriggerGroupWebhookTargetsListResponse,
  'slates/trigger_group.webhook.register': slatesMessageTriggerGroupWebhookRegisterResponse,
  'slates/trigger_group.webhook.unregister': slatesMessageTriggerGroupWebhookUnregisterResponse,
  'slates/trigger_group.webhook.manual_setup':
    slatesMessageTriggerGroupWebhookManualSetupResponse,
  'slates/trigger_group.webhook.manual_finish':
    slatesMessageTriggerGroupWebhookManualFinishResponse,
  'slates/trigger_group.webhook.process': slatesMessageTriggerGroupWebhookProcessResponse,
  'slates/trigger_group.routing_matchers.get':
    slatesMessageTriggerGroupRoutingMatchersGetResponse,
  'slates/trigger_group.polling.poll': slatesMessageTriggerGroupPollingPollResponse
};

export let slatesTriggerGroupRequestsByMethod = {
  'slates/trigger_groups.list': slatesMessageTriggerGroupsListRequest,
  'slates/trigger_group.get': slatesMessageTriggerGroupGetRequest,
  'slates/trigger_group.webhook.targets_list':
    slatesMessageTriggerGroupWebhookTargetsListRequest,
  'slates/trigger_group.webhook.register': slatesMessageTriggerGroupWebhookRegisterRequest,
  'slates/trigger_group.webhook.unregister': slatesMessageTriggerGroupWebhookUnregisterRequest,
  'slates/trigger_group.webhook.manual_setup': slatesMessageTriggerGroupWebhookManualSetupRequest,
  'slates/trigger_group.webhook.manual_finish':
    slatesMessageTriggerGroupWebhookManualFinishRequest,
  'slates/trigger_group.webhook.process': slatesMessageTriggerGroupWebhookProcessRequest,
  'slates/trigger_group.routing_matchers.get':
    slatesMessageTriggerGroupRoutingMatchersGetRequest,
  'slates/trigger_group.polling.poll': slatesMessageTriggerGroupPollingPollRequest
};
