import {
  computeDispatchWebhookRequestHash,
  computeOriginalWebhookRequestHash,
  type SLATE_WEBHOOK_PROVIDER_VERIFIER_IDS,
  SLATES_PROTOCOL_VERSION,
  type SlatesAction,
  SlatesProviderProtoHandlerManager,
  type WebhookWireRequest
} from '@slates/proto';
import { createProviderHandler } from '@slates/provider-handler';
import { SlateContext, SlateLogger } from 'slates';
import { describe, expect, it, vi } from 'vitest';
import { provider } from '../../index';
import { spec } from '../../spec';
import { TEST_PROVIDER_TOKEN, type WebhookVerificationEcho } from './shared';

type ProviderVerifierId = (typeof SLATE_WEBHOOK_PROVIDER_VERIFIER_IDS)[number];
type SerializedTriggerAction = Extract<SlatesAction, { type: 'action.trigger' }>;

type CandidateBinding = {
  candidateId: string;
  index: number;
  bindingHash: string;
  deliveryIds: string[];
};

type GraphMappedInput = WebhookVerificationEcho & { candidateId: string };

type ProviderCase = {
  verifierId: ProviderVerifierId;
  authenticatedFields: Record<string, string> | null;
};

let providerCases: ProviderCase[] = [
  {
    verifierId: 'quickbooks.delivery.v1',
    authenticatedFields: { event_id: 'event-quickbooks' }
  },
  {
    verifierId: 'kofi.delivery.v1',
    authenticatedFields: { event_id: 'event-kofi' }
  },
  {
    verifierId: 'braintree.delivery.v1',
    authenticatedFields: { delivery_id: 'delivery-braintree' }
  },
  {
    verifierId: 'paypal.delivery.v1',
    authenticatedFields: {
      event_id: 'event-paypal',
      delivery_id: 'delivery-paypal'
    }
  },
  {
    verifierId: 'notion.delivery.v1',
    authenticatedFields: { event_id: 'event-notion' }
  },
  {
    verifierId: 'asana.delivery.v1',
    authenticatedFields: { event_id: 'event-asana' }
  },
  {
    verifierId: 'cursor.delivery.v1',
    authenticatedFields: { event_id: 'event-cursor' }
  },
  {
    verifierId: 'google_calendar.delivery.v1',
    authenticatedFields: { event_id: 'event-google-calendar' }
  },
  {
    verifierId: 'graph.change_notification.provider.v1',
    authenticatedFields: null
  },
  {
    verifierId: 'meta.delivery.v1',
    authenticatedFields: { event_id: 'event-meta' }
  },
  {
    verifierId: 'zoom.delivery.v1',
    authenticatedFields: {
      timestamp: '1700000000',
      event_id: 'event-zoom'
    }
  }
];

let graphCandidates: CandidateBinding[] = [
  {
    candidateId: 'graph.body_value.v1:1:candidate-one',
    index: 1,
    bindingHash: 'a'.repeat(64),
    deliveryIds: ['graph-event-one']
  },
  {
    candidateId: 'graph.body_value.v1:3:candidate-three',
    index: 3,
    bindingHash: 'b'.repeat(64),
    deliveryIds: ['graph-event-three']
  }
];

let graphOriginalValues = [
  { id: 'ignored-zero', value: 'ignored-zero' },
  {
    id: 'graph-event-one',
    value: 'selected-one',
    clientState: 'graph-client-state-one'
  },
  { id: 'ignored-two', value: 'ignored-two' },
  {
    id: 'graph-event-three',
    value: 'selected-three',
    clientState: 'graph-client-state-three'
  }
];

let providerActionKey = (verifierId: ProviderVerifierId) =>
  `verify_provider_${verifierId.replaceAll('.', '_')}`;

let encodeBody = (value: unknown) => ({
  present: true as const,
  base64: Buffer.from(JSON.stringify(value)).toString('base64')
});

let validBody = (testCase: ProviderCase) => {
  if (testCase.verifierId === 'graph.change_notification.provider.v1') {
    return { value: graphOriginalValues };
  }
  return testCase.authenticatedFields;
};

let createRequest = (
  testCase: ProviderCase,
  tokenHeaders: [string, string][],
  body: unknown = validBody(testCase)
): WebhookWireRequest => ({
  url: 'https://callbacks.example.test/receiver-secret',
  method: 'POST',
  headers: [['content-type', 'application/json'], ...tokenHeaders],
  body: encodeBody(body)
});

let initializeRuntime = async () => {
  let grants = new Map<
    string,
    {
      expected: {
        requestId: string;
        operation: 'webhook_verify' | 'webhook_handle';
        actionId: string;
        secretNames: string[];
        callbackSecretNames: string[];
        requiresAuthConfig: boolean;
      };
      redeemed: {
        bindings: Record<string, unknown>;
        secrets: Record<string, { value: string }>;
        clear: ReturnType<typeof vi.fn>;
      };
    }
  >();
  let redemptionCalls: {
    envelope: {
      version: 'scoped_invocation_grant_v1';
      grantId: string;
      token: string;
      requestId: string;
    };
    expected: {
      requestId: string;
      operation:
        | 'webhook_verify'
        | 'webhook_bootstrap_capture'
        | 'webhook_handle'
        | 'tool_invoke';
      actionId: string;
      secretNames: readonly string[];
      callbackSecretNames: readonly string[];
      requiresAuthConfig: boolean;
    };
  }[] = [];
  let redeemScopedInvocationGrant = vi.fn(
    async (input: {
      envelope: {
        version: 'scoped_invocation_grant_v1';
        grantId: string;
        token: string;
        requestId: string;
      };
      expected: {
        requestId: string;
        operation:
          | 'webhook_verify'
          | 'webhook_bootstrap_capture'
          | 'webhook_handle'
          | 'tool_invoke';
        actionId: string;
        secretNames: readonly string[];
        callbackSecretNames: readonly string[];
        requiresAuthConfig: boolean;
      };
    }) => {
      redemptionCalls.push(input);
      let grant = grants.get(input.envelope.grantId);
      if (!grant) throw new Error('Unknown scoped invocation grant');
      expect(input.expected).toEqual(grant.expected);
      return grant.redeemed as never;
    }
  );
  let manager = await createProviderHandler(provider, [], {
    redeemScopedInvocationGrant,
    now: () => 1_000
  }).run();
  await SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    method: 'slates/hello',
    params: { protocol: SLATES_PROTOCOL_VERSION }
  });
  await SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    method: 'slates/participant.set',
    params: { participants: [{ type: 'hub', id: 'hub', name: 'Hub' }] }
  });
  let actionResponse = await SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    id: 'provider-actions',
    method: 'slates/actions.list',
    params: {}
  });
  if (!actionResponse || !('result' in actionResponse)) {
    throw new Error('Provider handler did not serialize provider actions');
  }
  let actions = actionResponse.result.actions as SerializedTriggerAction[];

  return {
    manager,
    grants,
    redemptionCalls,
    getAction: (verifierId: ProviderVerifierId) => {
      let action = actions.find(candidate => candidate.id === providerActionKey(verifierId));
      if (!action || action.invocation.type !== 'webhook' || !action.specHash) {
        throw new Error(`Missing serialized provider action for ${verifierId}`);
      }
      return action;
    }
  };
};

type Runtime = Awaited<ReturnType<typeof initializeRuntime>>;

let installGrant = (
  runtime: Runtime,
  input: {
    requestId: string;
    operation: 'webhook_verify' | 'webhook_handle';
    action: SerializedTriggerAction;
    verifierId: ProviderVerifierId;
    originalRequestHash: string;
    dispatchRequestHash: string;
    candidateBindings: CandidateBinding[];
    token?: string;
  }
) => {
  let grantId = `grant-${input.requestId}`;
  let clear = vi.fn();
  let secretNames = input.operation === 'webhook_verify' ? ['provider_token'] : [];
  runtime.grants.set(grantId, {
    expected: {
      requestId: input.requestId,
      operation: input.operation,
      actionId: input.action.id,
      secretNames,
      callbackSecretNames: input.operation === 'webhook_verify' ? ['provider_token'] : [],
      requiresAuthConfig: false
    },
    redeemed: {
      bindings: {
        grantId,
        tenantId: 'tenant-provider-boundary',
        slateInstanceId: 'instance-provider-boundary',
        hubInvocationId: `hub-${input.requestId}`,
        requestId: input.requestId,
        operation: input.operation,
        actionId: input.action.id,
        specHash: input.action.specHash,
        ruleId: input.verifierId,
        originalRequestHash: input.originalRequestHash,
        dispatchRequestHash: input.dispatchRequestHash,
        receiverId: 'receiver-provider-boundary',
        receiverTriggerId: 'receiver-trigger-provider-boundary',
        registrationStatus: 'registered',
        registrationGeneration: 17,
        registrationVersion: 23,
        authConfigId: null,
        callbackSecretIds:
          input.operation === 'webhook_verify'
            ? { provider_token: 'secret-provider-token' }
            : {},
        issuedAtMs: 900,
        expiresAtMs: 1_100,
        candidateBindings: input.candidateBindings
      },
      secrets:
        input.operation === 'webhook_verify'
          ? {
              provider_token: {
                value: input.token ?? TEST_PROVIDER_TOKEN
              }
            }
          : {},
      clear
    }
  });
  return {
    grantId,
    clear,
    invocation: {
      version: 'scoped_invocation_grant_v1' as const,
      grantId,
      token: `opaque-${input.requestId}`,
      requestId: input.requestId
    }
  };
};

let invokeVerify = async (
  runtime: Runtime,
  input: {
    testCase: ProviderCase;
    requestId: string;
    tokenHeaders: [string, string][];
    body?: unknown;
    candidates?: CandidateBinding[];
  }
) => {
  let action = runtime.getAction(input.testCase.verifierId);
  let request = createRequest(input.testCase, input.tokenHeaders, input.body);
  let requestHash = computeOriginalWebhookRequestHash(request);
  let candidates =
    input.testCase.verifierId === 'graph.change_notification.provider.v1'
      ? (input.candidates ?? graphCandidates)
      : [];
  let grant = installGrant(runtime, {
    requestId: input.requestId,
    operation: 'webhook_verify',
    action,
    verifierId: input.testCase.verifierId,
    originalRequestHash: requestHash,
    dispatchRequestHash: requestHash,
    candidateBindings: candidates
  });
  let response = await SlatesProviderProtoHandlerManager.handleInput(runtime.manager, {
    jsonrpc: '2.0',
    id: input.requestId,
    method: 'slates/action.trigger.webhook_verify',
    invocation: grant.invocation,
    params: {
      actionId: action.id,
      specHash: action.specHash!,
      ruleId: input.testCase.verifierId,
      requestId: input.requestId,
      originalRequest: request,
      originalRequestHash: requestHash,
      ...(candidates.length > 0
        ? {
            itemAdapter: {
              id: 'graph.body_value.v1' as const,
              candidates
            }
          }
        : {})
    }
  });
  return { action, request, requestHash, response, grant, candidates };
};

describe('Synthetic provider-boundary scoped execution', () => {
  it('accepts valid provider tokens for all verifier IDs with exact allowlisted outputs', async () => {
    let runtime = await initializeRuntime();

    for (let [index, testCase] of providerCases.entries()) {
      let result = await invokeVerify(runtime, {
        testCase,
        requestId: `rpc-valid-${index}`,
        tokenHeaders: [['X-Test-Provider-Token', TEST_PROVIDER_TOKEN]]
      });
      if (!result.response || !('result' in result.response)) {
        throw new Error(`Valid verification failed for ${testCase.verifierId}`);
      }

      if (testCase.verifierId === 'graph.change_notification.provider.v1') {
        expect(result.response.result).toEqual({
          status: 'accepted',
          selection: {
            scope: 'verified_items',
            itemAdapterId: 'graph.body_value.v1',
            acceptedCandidateIds: graphCandidates.map(candidate => candidate.candidateId)
          }
        });
        expect(result.response.result).not.toHaveProperty('authenticatedFields');
      } else {
        expect(result.response.result).toEqual({
          status: 'accepted',
          authenticatedFields: testCase.authenticatedFields,
          selection: { scope: 'receiver_trigger' }
        });
      }
      expect(JSON.stringify(result.response)).not.toContain(TEST_PROVIDER_TOKEN);
      expect(result.grant.clear).toHaveBeenCalledOnce();
    }
  });

  it('accepts grant-bound Graph candidates whose body values have no id', async () => {
    let runtime = await initializeRuntime();
    let graphCase = providerCases.find(
      testCase => testCase.verifierId === 'graph.change_notification.provider.v1'
    )!;
    let candidates: CandidateBinding[] = [
      {
        candidateId: 'graph.body_value.v1:1:change-id',
        index: 1,
        bindingHash: 'c'.repeat(64),
        deliveryIds: ['graph-change-one']
      },
      {
        candidateId: 'graph.body_value.v1:3:sequence-number',
        index: 3,
        bindingHash: 'd'.repeat(64),
        deliveryIds: ['graph-sequence-three']
      }
    ];
    let result = await invokeVerify(runtime, {
      testCase: graphCase,
      requestId: 'rpc-graph-no-id',
      tokenHeaders: [['x-test-provider-token', TEST_PROVIDER_TOKEN]],
      candidates,
      body: {
        value: [
          { ignored: 'zero' },
          { changeId: 'graph-change-one', resource: '/resource/one' },
          { ignored: 'two' },
          { sequenceNumber: 'graph-sequence-three', resource: '/resource/three' }
        ]
      }
    });

    expect(result.response).toMatchObject({
      result: {
        status: 'accepted',
        selection: {
          scope: 'verified_items',
          itemAdapterId: 'graph.body_value.v1',
          acceptedCandidateIds: candidates.map(candidate => candidate.candidateId)
        }
      }
    });
    expect(result.response).not.toHaveProperty('error');
    expect(result.grant.clear).toHaveBeenCalledOnce();
  });

  it('returns safe credential_invalid rejections for every invalid provider token', async () => {
    let runtime = await initializeRuntime();

    for (let [index, testCase] of providerCases.entries()) {
      let invalidToken = `invalid-provider-token-${index}`;
      let result = await invokeVerify(runtime, {
        testCase,
        requestId: `rpc-invalid-${index}`,
        tokenHeaders: [['x-test-provider-token', invalidToken]]
      });

      expect(result.response).toMatchObject({
        result: { status: 'rejected', code: 'credential_invalid' }
      });
      expect(result.response).not.toHaveProperty('error');
      expect(JSON.stringify(result.response)).not.toContain(invalidToken);
      expect(JSON.stringify(result.response)).not.toContain(TEST_PROVIDER_TOKEN);
      expect(result.grant.clear).toHaveBeenCalledOnce();
    }
  });

  it('rejects missing and case-insensitive duplicate provider-token headers for all IDs', async () => {
    let runtime = await initializeRuntime();

    for (let [index, testCase] of providerCases.entries()) {
      let missing = await invokeVerify(runtime, {
        testCase,
        requestId: `rpc-missing-${index}`,
        tokenHeaders: []
      });
      expect(missing.response).toMatchObject({
        result: { status: 'rejected', code: 'credential_missing' }
      });
      expect(missing.grant.clear).toHaveBeenCalledOnce();

      let duplicate = await invokeVerify(runtime, {
        testCase,
        requestId: `rpc-duplicate-${index}`,
        tokenHeaders: [
          ['X-Test-Provider-Token', TEST_PROVIDER_TOKEN],
          ['x-test-provider-token', TEST_PROVIDER_TOKEN]
        ]
      });
      expect(duplicate.response).toMatchObject({
        result: { status: 'rejected', code: 'security_header_ambiguous' }
      });
      expect(duplicate.grant.clear).toHaveBeenCalledOnce();
    }
  });

  it('rejects malformed or incomplete authenticated payloads for all IDs', async () => {
    let runtime = await initializeRuntime();

    for (let [index, testCase] of providerCases.entries()) {
      let result = await invokeVerify(runtime, {
        testCase,
        requestId: `rpc-malformed-${index}`,
        tokenHeaders: [['x-test-provider-token', TEST_PROVIDER_TOKEN]],
        body:
          testCase.verifierId === 'graph.change_notification.provider.v1' ? { value: [] } : {}
      });
      expect(result.response).toMatchObject({
        result: { status: 'rejected', code: 'wire_input_malformed' }
      });
      expect(result.grant.clear).toHaveBeenCalledOnce();
    }
  });

  it('uses a separate scoped mapping grant and pairs compacted Graph values by position', async () => {
    let runtime = await initializeRuntime();
    let graphCase = providerCases.find(
      testCase => testCase.verifierId === 'graph.change_notification.provider.v1'
    )!;
    let verified = await invokeVerify(runtime, {
      testCase: graphCase,
      requestId: 'rpc-graph-verify',
      tokenHeaders: [['x-test-provider-token', TEST_PROVIDER_TOKEN]]
    });
    expect(verified.response).toMatchObject({
      result: { status: 'accepted', selection: { scope: 'verified_items' } }
    });
    expect(verified.grant.clear).toHaveBeenCalledOnce();

    let reconstructedValues = [graphOriginalValues[1], graphOriginalValues[3]];
    let reconstructedRequest: WebhookWireRequest = {
      url: 'https://callbacks.example.test/receiver-secret',
      method: 'POST',
      headers: [
        ['content-type', 'application/json'],
        ['authorization', 'Bearer graph-mapping-secret'],
        ['x-test-provider-token', TEST_PROVIDER_TOKEN],
        ['x-neutral', 'safe']
      ],
      body: encodeBody({ value: reconstructedValues })
    };
    let dispatchRequestHash = computeDispatchWebhookRequestHash(reconstructedRequest);
    let mappingGrant = installGrant(runtime, {
      requestId: 'rpc-graph-handle',
      operation: 'webhook_handle',
      action: verified.action,
      verifierId: graphCase.verifierId,
      originalRequestHash: verified.requestHash,
      dispatchRequestHash,
      candidateBindings: graphCandidates
    });
    expect(mappingGrant.grantId).not.toBe(verified.grant.grantId);

    let response = await SlatesProviderProtoHandlerManager.handleInput(runtime.manager, {
      jsonrpc: '2.0',
      id: 'rpc-graph-handle',
      method: 'slates/action.trigger.webhook_handle',
      invocation: mappingGrant.invocation,
      params: {
        actionId: verified.action.id,
        request: reconstructedRequest,
        specHash: verified.action.specHash!,
        ruleId: graphCase.verifierId,
        triggerId: 'receiver-trigger-provider-boundary',
        originalRequestHash: verified.requestHash,
        dispatchRequestHash,
        itemAdapterId: 'graph.body_value.v1',
        selectedItems: graphCandidates
      }
    });

    expect(response).toMatchObject({
      result: {
        inputs: [
          {
            candidateId: graphCandidates[0]!.candidateId,
            receivedAt: expect.any(String),
            method: 'POST',
            url: 'https://callbacks.example.test/:receiver-secret',
            headers: {
              authorization: '[redacted]',
              'content-type': 'application/json',
              'x-neutral': 'safe',
              'x-test-provider-token': '[redacted]'
            },
            payload: {
              id: 'graph-event-one',
              value: 'selected-one',
              clientState: '[redacted]'
            }
          },
          {
            candidateId: graphCandidates[1]!.candidateId,
            receivedAt: expect.any(String),
            method: 'POST',
            url: 'https://callbacks.example.test/:receiver-secret',
            headers: {
              authorization: '[redacted]',
              'content-type': 'application/json',
              'x-neutral': 'safe',
              'x-test-provider-token': '[redacted]'
            },
            payload: {
              id: 'graph-event-three',
              value: 'selected-three',
              clientState: '[redacted]'
            }
          }
        ]
      }
    });
    if (!response || !('result' in response)) {
      throw new Error('Scoped Graph mapping did not return mapped inputs');
    }
    let graphAction = provider.actions.find(action => action.key === verified.action.id);
    if (!graphAction || graphAction.type !== 'trigger') {
      throw new Error('Expected the Graph provider-boundary trigger action');
    }
    let simultaneousInputs = response.result.inputs.map((input: GraphMappedInput) => ({
      ...input,
      receivedAt: '2026-08-18T17:00:00.000Z'
    }));
    let mappedEvents = await Promise.all(
      simultaneousInputs.map((input: GraphMappedInput) =>
        graphAction.handleEvent(
          new SlateContext({}, input, {}, spec, new SlateLogger([])) as never
        )
      )
    );
    expect(mappedEvents.map(event => event.id)).toEqual(
      graphCandidates.map(candidate => `${verified.action.id}-${candidate.candidateId}`)
    );
    expect(new Set(mappedEvents.map(event => event.id))).toHaveLength(2);
    expect(JSON.stringify(response)).not.toContain(TEST_PROVIDER_TOKEN);
    expect(JSON.stringify(response)).not.toContain('graph-mapping-secret');
    expect(JSON.stringify(response)).not.toContain('graph-client-state-one');
    expect(JSON.stringify(response)).not.toContain('graph-client-state-three');
    expect(mappingGrant.clear).toHaveBeenCalledOnce();
  });

  it('does not issue or invoke Graph mapping after an invalid token rejection', async () => {
    let runtime = await initializeRuntime();
    let mappingIssued = vi.fn();
    let graphCase = providerCases.find(
      testCase => testCase.verifierId === 'graph.change_notification.provider.v1'
    )!;
    let verified = await invokeVerify(runtime, {
      testCase: graphCase,
      requestId: 'rpc-graph-invalid',
      tokenHeaders: [['x-test-provider-token', 'invalid-graph-provider-token']]
    });
    if (
      verified.response &&
      'result' in verified.response &&
      verified.response.result.status === 'accepted'
    ) {
      mappingIssued();
    }

    expect(verified.response).toMatchObject({
      result: { status: 'rejected', code: 'credential_invalid' }
    });
    expect(mappingIssued).not.toHaveBeenCalled();
    expect(
      runtime.redemptionCalls.filter(call => call.expected.operation === 'webhook_handle')
    ).toHaveLength(0);
    expect(verified.grant.clear).toHaveBeenCalledOnce();
  });
});
