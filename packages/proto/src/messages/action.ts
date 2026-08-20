import z from 'zod';
import {
  safeWebhookRejectionCode,
  slatesAction,
  webhookWireRequest,
  webhookWireResponse
} from '../types';
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

let webhookSha256 = z.string().regex(/^[a-f0-9]{64}$/);
let webhookContractIdentifier = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9](?:[A-Za-z0-9._:/-]*[A-Za-z0-9])?$/);

export let slatesCapturedWebhookSecrets = z.record(
  webhookContractIdentifier,
  z.strictObject({
    value: z.string(),
    version: z.number().int().positive()
  })
);

export let slatesScopedInvocationGrantEnvelope = z.strictObject({
  version: z.literal('scoped_invocation_grant_v1'),
  grantId: webhookContractIdentifier,
  token: z.string().min(1),
  requestId: z.string().min(1)
});

export type SlatesScopedInvocationGrantEnvelope = z.infer<
  typeof slatesScopedInvocationGrantEnvelope
>;

let webhookItemAdapter = z
  .strictObject({
    id: z.literal('graph.body_value.v1'),
    candidates: z.array(
      z.strictObject({
        candidateId: webhookContractIdentifier,
        index: z.number().int().nonnegative(),
        bindingHash: webhookSha256,
        deliveryIds: z
          .array(z.string().min(1))
          .min(1)
          .refine(ids => new Set(ids).size === ids.length, {
            message: 'Candidate delivery IDs must not contain duplicates'
          })
      })
    )
  })
  .superRefine((adapter, context) => {
    let candidateIds = adapter.candidates.map(candidate => candidate.candidateId);
    let indexes = adapter.candidates.map(candidate => candidate.index);
    if (new Set(candidateIds).size !== candidateIds.length) {
      context.addIssue({
        code: 'custom',
        path: ['candidates'],
        message: 'Candidate IDs must be unique'
      });
    }
    if (new Set(indexes).size !== indexes.length) {
      context.addIssue({
        code: 'custom',
        path: ['candidates'],
        message: 'Candidate indexes must be unique'
      });
    }
  });

export let slatesWebhookVerifyInput = z.strictObject({
  actionId: webhookContractIdentifier,
  specHash: webhookSha256,
  ruleId: webhookContractIdentifier,
  requestId: z.string().min(1),
  originalRequest: webhookWireRequest,
  originalRequestHash: webhookSha256,
  itemAdapter: webhookItemAdapter.optional()
});

export let slatesWebhookVerifyOutput = z.discriminatedUnion('status', [
  z.strictObject({
    status: z.literal('accepted'),
    authenticatedFields: z.record(webhookContractIdentifier, z.string().min(1)).optional(),
    selection: z.discriminatedUnion('scope', [
      z.strictObject({ scope: z.literal('receiver_trigger') }),
      z.strictObject({
        scope: z.literal('verified_items'),
        itemAdapterId: z.literal('graph.body_value.v1'),
        acceptedCandidateIds: z
          .array(webhookContractIdentifier)
          .min(1)
          .refine(ids => new Set(ids).size === ids.length, {
            message: 'Accepted candidate IDs must not contain duplicates'
          })
      })
    ])
  }),
  z.strictObject({
    status: z.literal('rejected'),
    code: safeWebhookRejectionCode
  })
]);

export let slatesWebhookBootstrapCaptureInput = slatesWebhookVerifyInput.extend({
  phase: z.literal('bootstrap'),
  receiverTriggerId: webhookContractIdentifier,
  registrationVersion: z.number().int().positive(),
  acceptedCandidateIds: z
    .array(webhookContractIdentifier)
    .refine(ids => new Set(ids).size === ids.length, {
      message: 'Accepted candidate IDs must not contain duplicates'
    })
});

export let slatesWebhookBootstrapCaptureOutput = z.discriminatedUnion('status', [
  z.strictObject({
    status: z.literal('accepted'),
    capturedSecrets: slatesCapturedWebhookSecrets,
    response: webhookWireResponse,
    replayClaim: z
      .strictObject({
        deliveryIds: z.array(z.string().min(1)),
        freshnessTimestampMs: z.number().int().nonnegative().optional()
      })
      .optional()
  }),
  z.strictObject({
    status: z.literal('rejected'),
    code: safeWebhookRejectionCode
  })
]);

export type WebhookVerifyInput = z.infer<typeof slatesWebhookVerifyInput>;
export type WebhookVerifyOutput = z.infer<typeof slatesWebhookVerifyOutput>;
export type WebhookBootstrapCaptureInput = z.infer<typeof slatesWebhookBootstrapCaptureInput>;
export type WebhookBootstrapCaptureOutput = z.infer<
  typeof slatesWebhookBootstrapCaptureOutput
>;

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
export let slatesMessageActionInvokeRequest = z
  .object({
    jsonrpc: z.literal('2.0'),
    method: z.literal('slates/action.tool.invoke'),
    id: z.string(),
    invocation: slatesScopedInvocationGrantEnvelope.optional(),
    params: z.object({
      actionId: z.string(),
      input: z.record(z.string(), z.any())
    })
  })
  .superRefine((message, context) => {
    if (message.invocation && message.invocation.requestId !== message.id) {
      context.addIssue({
        code: 'custom',
        path: ['invocation', 'requestId'],
        message: 'The invocation grant and tool request must bind the JSON-RPC request ID'
      });
    }
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
export let slatesMessageActionTriggerWebhookHandleLegacyRequest = z.object({
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

export let slatesWebhookHandleSelectedItem = z.strictObject({
  candidateId: webhookContractIdentifier,
  index: z.number().int().nonnegative(),
  bindingHash: webhookSha256,
  deliveryIds: z
    .array(z.string().min(1))
    .min(1)
    .refine(ids => new Set(ids).size === ids.length, {
      message: 'Selected item delivery IDs must not contain duplicates'
    })
});

/** Strict v2 mapping input; legacy handle requests remain supported for the reviewed fallback. */
export let slatesMessageActionTriggerWebhookHandleScopedRequest = z
  .strictObject({
    jsonrpc: z.literal('2.0'),
    method: z.literal('slates/action.trigger.webhook_handle'),
    id: z.string(),
    invocation: slatesScopedInvocationGrantEnvelope,
    params: z.strictObject({
      actionId: webhookContractIdentifier,
      request: webhookWireRequest,
      specHash: webhookSha256,
      ruleId: webhookContractIdentifier,
      triggerId: webhookContractIdentifier,
      originalRequestHash: webhookSha256,
      dispatchRequestHash: webhookSha256,
      itemAdapterId: z.literal('graph.body_value.v1').optional(),
      selectedItems: z.array(slatesWebhookHandleSelectedItem).min(1).optional()
    })
  })
  .superRefine((message, context) => {
    if (message.invocation.requestId !== message.id) {
      context.addIssue({
        code: 'custom',
        path: ['invocation', 'requestId'],
        message: 'The mapping grant must bind the JSON-RPC request ID'
      });
    }
    if (
      (message.params.itemAdapterId === undefined) !==
      (message.params.selectedItems === undefined)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['params', 'selectedItems'],
        message: 'Selected item bindings require the exact adapter version'
      });
    }
    let selectedIds = message.params.selectedItems?.map(item => item.candidateId) ?? [];
    let selectedIndexes = message.params.selectedItems?.map(item => item.index) ?? [];
    if (new Set(selectedIds).size !== selectedIds.length) {
      context.addIssue({
        code: 'custom',
        path: ['params', 'selectedItems'],
        message: 'Selected item bindings must have unique candidate IDs'
      });
    }
    if (new Set(selectedIndexes).size !== selectedIndexes.length) {
      context.addIssue({
        code: 'custom',
        path: ['params', 'selectedItems'],
        message: 'Selected item bindings must have unique indexes'
      });
    }
  });

export type SlatesMessageActionTriggerWebhookHandleScopedRequest = z.infer<
  typeof slatesMessageActionTriggerWebhookHandleScopedRequest
>;

export let slatesMessageActionTriggerWebhookHandleRequest = z.union([
  slatesMessageActionTriggerWebhookHandleScopedRequest,
  slatesMessageActionTriggerWebhookHandleLegacyRequest
]);

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

/**
 * Verify a bounded inbound webhook request. The scoped grant is carried beside params so it
 * cannot be confused with provider-controlled input or reusable session state.
 */
export let slatesMessageActionTriggerWebhookVerifyRequest = z
  .strictObject({
    jsonrpc: z.literal('2.0'),
    method: z.literal('slates/action.trigger.webhook_verify'),
    id: z.string(),
    invocation: slatesScopedInvocationGrantEnvelope,
    params: slatesWebhookVerifyInput
  })
  .superRefine((message, context) => {
    if (
      message.invocation.requestId !== message.id ||
      message.params.requestId !== message.id
    ) {
      context.addIssue({
        code: 'custom',
        path: ['invocation', 'requestId'],
        message: 'The invocation grant and webhook request must bind the JSON-RPC request ID'
      });
    }
  });

export type SlatesMessageActionTriggerWebhookVerifyRequest = z.infer<
  typeof slatesMessageActionTriggerWebhookVerifyRequest
>;

export let slatesMessageActionTriggerWebhookVerifyResponse = z.strictObject({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: slatesWebhookVerifyOutput
});

export type SlatesMessageActionTriggerWebhookVerifyResponse = z.infer<
  typeof slatesMessageActionTriggerWebhookVerifyResponse
>;

export let slatesMessageActionTriggerWebhookBootstrapCaptureRequest = z
  .strictObject({
    jsonrpc: z.literal('2.0'),
    method: z.literal('slates/action.trigger.webhook_bootstrap_capture'),
    id: z.string(),
    invocation: slatesScopedInvocationGrantEnvelope,
    params: slatesWebhookBootstrapCaptureInput
  })
  .superRefine((message, context) => {
    if (
      message.invocation.requestId !== message.id ||
      message.params.requestId !== message.id
    ) {
      context.addIssue({
        code: 'custom',
        path: ['invocation', 'requestId'],
        message: 'The invocation grant and bootstrap request must bind the JSON-RPC request ID'
      });
    }
  });

export type SlatesMessageActionTriggerWebhookBootstrapCaptureRequest = z.infer<
  typeof slatesMessageActionTriggerWebhookBootstrapCaptureRequest
>;

export let slatesMessageActionTriggerWebhookBootstrapCaptureResponse = z.strictObject({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: slatesWebhookBootstrapCaptureOutput
});

export type SlatesMessageActionTriggerWebhookBootstrapCaptureResponse = z.infer<
  typeof slatesMessageActionTriggerWebhookBootstrapCaptureResponse
>;

/**
 * Handle Webhook Registration
 */
export let slatesMessageActionTriggerWebhookRegisterRequest = z.strictObject({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/action.trigger.webhook_register'),
  id: z.string(),
  params: z.strictObject({
    actionId: z.string(),
    webhookBaseUrl: z.string(),
    registrationDetails: z.any().nullable().optional(),
    capturedSecretVersions: z.record(z.string(), z.number().int().positive()).default({})
  })
});

export type SlatesMessageActionTriggerWebhookRegisterRequest = z.infer<
  typeof slatesMessageActionTriggerWebhookRegisterRequest
>;

export let slatesMessageActionTriggerWebhookRegisterResponse = z.strictObject({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    registrationDetails: z.any(),
    state: z.any().optional(),
    capturedSecrets: slatesCapturedWebhookSecrets.optional()
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
  | SlatesMessageActionTriggerWebhookVerifyRequest
  | SlatesMessageActionTriggerWebhookBootstrapCaptureRequest
  | SlatesMessageActionTriggerWebhookRegisterRequest
  | SlatesMessageActionTriggerWebhookUnregisterRequest;

export type SlatesActionResponses =
  | SlatesMessageActionsListResponse
  | SlatesMessageActionGetResponse
  | SlatesMessageActionInvokeResponse
  | SlatesMessageActionTriggerEventMapResponse
  | SlatesMessageActionTriggerEventsPollResponse
  | SlatesMessageActionTriggerWebhookHandleResponse
  | SlatesMessageActionTriggerWebhookVerifyResponse
  | SlatesMessageActionTriggerWebhookBootstrapCaptureResponse
  | SlatesMessageActionTriggerWebhookRegisterResponse
  | SlatesMessageActionTriggerWebhookUnregisterResponse;

export let slatesActionResponsesByMethod = {
  'slates/actions.list': slatesMessageActionsListResponse,
  'slates/action.get': slatesMessageActionGetResponse,
  'slates/action.tool.invoke': slatesMessageActionInvokeResponse,
  'slates/action.trigger.map_event': slatesMessageActionTriggerEventMapResponse,
  'slates/action.trigger.poll_events': slatesMessageActionTriggerEventsPollResponse,
  'slates/action.trigger.webhook_handle': slatesMessageActionTriggerWebhookHandleResponse,
  'slates/action.trigger.webhook_verify': slatesMessageActionTriggerWebhookVerifyResponse,
  'slates/action.trigger.webhook_bootstrap_capture':
    slatesMessageActionTriggerWebhookBootstrapCaptureResponse,
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
  'slates/action.trigger.webhook_verify': slatesMessageActionTriggerWebhookVerifyRequest,
  'slates/action.trigger.webhook_bootstrap_capture':
    slatesMessageActionTriggerWebhookBootstrapCaptureRequest,
  'slates/action.trigger.webhook_register': slatesMessageActionTriggerWebhookRegisterRequest,
  'slates/action.trigger.webhook_unregister':
    slatesMessageActionTriggerWebhookUnregisterRequest
};
