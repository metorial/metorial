import z from 'zod';
import {
  slatesTriggerGroup,
  slatesTriggerGroupInfrastructure,
  slatesTriggerRoutingMatcher,
  slatesWebhookTarget
} from '../types';
import { slatesWebhookHttpResponse } from './action';
import { withRequestTraces } from './tracing';

let slatesTriggerGroupWebhookEvent = z.object({
  matchers: z.array(slatesTriggerRoutingMatcher),
  payload: z.record(z.string(), z.any()),
  idempotencyKey: z.string().optional(),
  triggerIds: z.array(z.string())
});

export let slatesTriggerGroupWebhookSkipped = z.object({
  reason: z.string()
});

export type SlatesTriggerGroupWebhookSkipped = z.infer<
  typeof slatesTriggerGroupWebhookSkipped
>;

let slatesTriggerGroupPollEvent = z.object({
  payload: z.record(z.string(), z.any()),
  idempotencyKey: z.string().optional(),
  triggerIds: z.array(z.string())
});

export let slatesTriggerGroupWebhookRegistrationResult = z.object({
  webhookRegistrationIdentifier: z.string(),
  webhookRegistrationPayload: z.any(),
  expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
  renewAfter: z.iso.datetime({ offset: true }).nullable().optional(),
  routingKeys: z.array(z.string().min(1).max(512)).max(16).optional()
});

export let slatesTriggerGroupWebhookExpansionResult = z.object({
  events: z.array(slatesTriggerGroupPollEvent.omit({ triggerIds: true })),
  updatedState: z.any().nullable().optional()
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
    pageToken: z.any().nullable().optional(),
    selection: z.record(z.string(), z.any()).optional()
  })
});

export type SlatesMessageTriggerGroupWebhookTargetsListRequest = z.infer<
  typeof slatesMessageTriggerGroupWebhookTargetsListRequest
>;

export let slatesMessageTriggerGroupWebhookTargetsListResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    targets: z.array(slatesWebhookTarget),
    nextPageToken: z.any().nullable(),
    isPartial: z.boolean().optional()
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
    webhookUrl: z.string(),
    operationId: z.string().min(1).optional(),
    selection: z.record(z.string(), z.any()).optional(),
    infrastructure: slatesTriggerGroupInfrastructure.optional()
  })
});

export type SlatesMessageTriggerGroupWebhookRegisterRequest = z.infer<
  typeof slatesMessageTriggerGroupWebhookRegisterRequest
>;

export let slatesMessageTriggerGroupWebhookRegisterResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces(slatesTriggerGroupWebhookRegistrationResult.shape)
});

export type SlatesMessageTriggerGroupWebhookRegisterResponse = z.infer<
  typeof slatesMessageTriggerGroupWebhookRegisterResponse
>;

/** Renew an existing automatically registered webhook. */
export let slatesMessageTriggerGroupWebhookRenewRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/trigger_group.webhook.renew'),
  id: z.string(),
  params: z.object({
    triggerGroupId: z.string(),
    webhookRegistrationIdentifier: z.string(),
    webhookRegistrationPayload: z.any(),
    webhookUrl: z.string(),
    webhookTargetIdentifier: z.string(),
    webhookTargetPayload: z.any(),
    operationId: z.string().min(1),
    selection: z.record(z.string(), z.any()).optional(),
    infrastructure: slatesTriggerGroupInfrastructure.optional()
  })
});

export type SlatesMessageTriggerGroupWebhookRenewRequest = z.infer<
  typeof slatesMessageTriggerGroupWebhookRenewRequest
>;

export let slatesMessageTriggerGroupWebhookRenewResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces(slatesTriggerGroupWebhookRegistrationResult.shape)
});

export type SlatesMessageTriggerGroupWebhookRenewResponse = z.infer<
  typeof slatesMessageTriggerGroupWebhookRenewResponse
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
    requiresExpansion: z.boolean().optional(),
    response: slatesWebhookHttpResponse.nullable().optional(),
    skipped: slatesTriggerGroupWebhookSkipped.nullable().optional()
  })
});

export type SlatesMessageTriggerGroupWebhookProcessResponse = z.infer<
  typeof slatesMessageTriggerGroupWebhookProcessResponse
>;

/** Expand a verified delivery using the connection's credentials and durable state. */
export let slatesMessageTriggerGroupWebhookExpandRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/trigger_group.webhook.expand'),
  id: z.string(),
  params: z.object({
    triggerGroupId: z.string(),
    payload: z.record(z.string(), z.any()).nullable(),
    state: z.any().nullable().optional(),
    selection: z.record(z.string(), z.any()).optional(),
    deliveryId: z.string().min(1),
    webhookRegistrationPayload: z.any()
  })
});

export type SlatesMessageTriggerGroupWebhookExpandRequest = z.infer<
  typeof slatesMessageTriggerGroupWebhookExpandRequest
>;

export let slatesMessageTriggerGroupWebhookExpandResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    events: z.array(slatesTriggerGroupPollEvent),
    updatedState: z.any().nullable().optional()
  })
});

export type SlatesMessageTriggerGroupWebhookExpandResponse = z.infer<
  typeof slatesMessageTriggerGroupWebhookExpandResponse
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
    state: z.any().nullable(),
    selection: z.record(z.string(), z.any()).optional()
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

/**
 * Gateway connect
 */
export let slatesMessageTriggerGroupGatewayConnectRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/trigger_group.gateway.connect'),
  id: z.string(),
  params: z.object({
    triggerGroupId: z.string(),
    state: z.any().nullable()
  })
});

export type SlatesMessageTriggerGroupGatewayConnectRequest = z.infer<
  typeof slatesMessageTriggerGroupGatewayConnectRequest
>;

export let slatesMessageTriggerGroupGatewayConnectResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    url: z.string(),
    state: z.any().nullable().optional()
  })
});

export type SlatesMessageTriggerGroupGatewayConnectResponse = z.infer<
  typeof slatesMessageTriggerGroupGatewayConnectResponse
>;

/**
 * Gateway receive
 */
export let slatesMessageTriggerGroupGatewayReceiveRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/trigger_group.gateway.receive'),
  id: z.string(),
  params: z.object({
    triggerGroupId: z.string(),
    state: z.any().nullable(),
    frames: z.array(z.string()),
    closed: z.object({ code: z.number(), reason: z.string() }).nullable().optional()
  })
});

export type SlatesMessageTriggerGroupGatewayReceiveRequest = z.infer<
  typeof slatesMessageTriggerGroupGatewayReceiveRequest
>;

export let slatesMessageTriggerGroupGatewayReceiveResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    state: z.any().nullable().optional(),
    send: z.array(z.string()),
    events: z.array(slatesTriggerGroupPollEvent),
    heartbeat: z
      .object({
        intervalMs: z.number().int().positive(),
        frame: z.string(),
        // The hub requires `heartbeatAcked` between beats and reconnects otherwise.
        expectsAck: z.boolean().optional()
      })
      .nullable()
      .optional(),
    // Set when these frames included the provider's acknowledgement of a heartbeat.
    heartbeatAcked: z.boolean().optional(),
    close: z
      .object({ reconnect: z.boolean(), reason: z.string().optional() })
      .nullable()
      .optional()
  })
});

export type SlatesMessageTriggerGroupGatewayReceiveResponse = z.infer<
  typeof slatesMessageTriggerGroupGatewayReceiveResponse
>;

export type SlatesTriggerGroupRequests =
  | SlatesMessageTriggerGroupsListRequest
  | SlatesMessageTriggerGroupGetRequest
  | SlatesMessageTriggerGroupWebhookTargetsListRequest
  | SlatesMessageTriggerGroupWebhookRegisterRequest
  | SlatesMessageTriggerGroupWebhookRenewRequest
  | SlatesMessageTriggerGroupWebhookExpandRequest
  | SlatesMessageTriggerGroupWebhookUnregisterRequest
  | SlatesMessageTriggerGroupWebhookManualSetupRequest
  | SlatesMessageTriggerGroupWebhookManualFinishRequest
  | SlatesMessageTriggerGroupWebhookProcessRequest
  | SlatesMessageTriggerGroupRoutingMatchersGetRequest
  | SlatesMessageTriggerGroupPollingPollRequest
  | SlatesMessageTriggerGroupGatewayConnectRequest
  | SlatesMessageTriggerGroupGatewayReceiveRequest;

export type SlatesTriggerGroupResponses =
  | SlatesMessageTriggerGroupsListResponse
  | SlatesMessageTriggerGroupGetResponse
  | SlatesMessageTriggerGroupWebhookTargetsListResponse
  | SlatesMessageTriggerGroupWebhookRegisterResponse
  | SlatesMessageTriggerGroupWebhookRenewResponse
  | SlatesMessageTriggerGroupWebhookExpandResponse
  | SlatesMessageTriggerGroupWebhookUnregisterResponse
  | SlatesMessageTriggerGroupWebhookManualSetupResponse
  | SlatesMessageTriggerGroupWebhookManualFinishResponse
  | SlatesMessageTriggerGroupWebhookProcessResponse
  | SlatesMessageTriggerGroupRoutingMatchersGetResponse
  | SlatesMessageTriggerGroupPollingPollResponse
  | SlatesMessageTriggerGroupGatewayConnectResponse
  | SlatesMessageTriggerGroupGatewayReceiveResponse;

export let slatesTriggerGroupResponsesByMethod = {
  'slates/trigger_groups.list': slatesMessageTriggerGroupsListResponse,
  'slates/trigger_group.get': slatesMessageTriggerGroupGetResponse,
  'slates/trigger_group.webhook.targets_list':
    slatesMessageTriggerGroupWebhookTargetsListResponse,
  'slates/trigger_group.webhook.register': slatesMessageTriggerGroupWebhookRegisterResponse,
  'slates/trigger_group.webhook.renew': slatesMessageTriggerGroupWebhookRenewResponse,
  'slates/trigger_group.webhook.expand': slatesMessageTriggerGroupWebhookExpandResponse,
  'slates/trigger_group.webhook.unregister':
    slatesMessageTriggerGroupWebhookUnregisterResponse,
  'slates/trigger_group.webhook.manual_setup':
    slatesMessageTriggerGroupWebhookManualSetupResponse,
  'slates/trigger_group.webhook.manual_finish':
    slatesMessageTriggerGroupWebhookManualFinishResponse,
  'slates/trigger_group.webhook.process': slatesMessageTriggerGroupWebhookProcessResponse,
  'slates/trigger_group.routing_matchers.get':
    slatesMessageTriggerGroupRoutingMatchersGetResponse,
  'slates/trigger_group.polling.poll': slatesMessageTriggerGroupPollingPollResponse,
  'slates/trigger_group.gateway.connect': slatesMessageTriggerGroupGatewayConnectResponse,
  'slates/trigger_group.gateway.receive': slatesMessageTriggerGroupGatewayReceiveResponse
};

export let slatesTriggerGroupRequestsByMethod = {
  'slates/trigger_groups.list': slatesMessageTriggerGroupsListRequest,
  'slates/trigger_group.get': slatesMessageTriggerGroupGetRequest,
  'slates/trigger_group.webhook.targets_list':
    slatesMessageTriggerGroupWebhookTargetsListRequest,
  'slates/trigger_group.webhook.register': slatesMessageTriggerGroupWebhookRegisterRequest,
  'slates/trigger_group.webhook.renew': slatesMessageTriggerGroupWebhookRenewRequest,
  'slates/trigger_group.webhook.expand': slatesMessageTriggerGroupWebhookExpandRequest,
  'slates/trigger_group.webhook.unregister': slatesMessageTriggerGroupWebhookUnregisterRequest,
  'slates/trigger_group.webhook.manual_setup':
    slatesMessageTriggerGroupWebhookManualSetupRequest,
  'slates/trigger_group.webhook.manual_finish':
    slatesMessageTriggerGroupWebhookManualFinishRequest,
  'slates/trigger_group.webhook.process': slatesMessageTriggerGroupWebhookProcessRequest,
  'slates/trigger_group.routing_matchers.get':
    slatesMessageTriggerGroupRoutingMatchersGetRequest,
  'slates/trigger_group.polling.poll': slatesMessageTriggerGroupPollingPollRequest,
  'slates/trigger_group.gateway.connect': slatesMessageTriggerGroupGatewayConnectRequest,
  'slates/trigger_group.gateway.receive': slatesMessageTriggerGroupGatewayReceiveRequest
};
