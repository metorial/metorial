import {
  SLATE_WEBHOOK_PRESET_DEFINITIONS,
  SLATE_WEBHOOK_PRESET_IDS,
  SLATE_WEBHOOK_PROVIDER_VERIFIER_IDS,
  SLATES_PROTOCOL_VERSION,
  type SlatesAction,
  SlatesProviderProtoHandlerManager
} from '@slates/proto';
import { createProviderHandler } from '@slates/provider-handler';
import { SlateContext, SlateLogger } from 'slates';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { provider } from '../../index';
import { spec } from '../../spec';
import { getTestGraphClientState } from './graph';
import {
  mapWebhookVerificationEvent,
  TEST_ED25519_PRIVATE_SEED_HEX,
  TEST_ED25519_PUBLIC_KEY_HEX,
  TEST_HMAC_SECRET,
  TEST_PROVIDER_TOKEN,
  TEST_STATIC_TOKEN
} from './shared';

type SerializedTriggerAction = Extract<SlatesAction, { type: 'action.trigger' }>;

let serializeActions = async () => {
  let manager = await createProviderHandler(provider, []).run();
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

  let response = await SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    id: 'actions',
    method: 'slates/actions.list',
    params: {}
  });
  if (!response || !('result' in response)) {
    throw new Error('Provider handler did not return serialized actions');
  }

  return response.result.actions as SerializedTriggerAction[];
};

let replay = {
  kind: 'enforced',
  deduplicate: {
    source: 'json_pointer',
    pointer: '/event_id',
    ttlSeconds: 3_600,
    scope: 'request'
  }
};

let expectedInvocation = (
  allowedSecretRefs: Record<string, unknown>[],
  verify: Record<string, unknown>
) => ({
  type: 'webhook',
  autoRegistration: true,
  autoUnregistration: false,
  http: {
    methods: ['POST'],
    ingress: {
      kind: 'receiver_route',
      baseline: 'receiver_path_secret',
      verification: {
        mechanism: 'hub',
        baseline: 'receiver_path_secret',
        allowedSecretRefs,
        rules: [
          {
            id: 'delivery.v1',
            phase: 'delivery',
            when: { methods: ['POST'] },
            verify,
            result: { type: 'dispatch', scope: 'receiver_trigger' },
            replay
          }
        ]
      }
    }
  }
});

let staticTokenSecret = {
  source: 'registration',
  name: 'static_token',
  registrationKey: 'staticToken',
  encoding: 'utf8'
};

let testConfig = {};

let canonicalPresetIds = [
  'slack.v0',
  'stripe.v1',
  'zoom.v0',
  'hubspot.v3',
  'gitlab.standard.v1',
  'zendesk.v1',
  'typeform.v1',
  'linear.v1',
  'graph.change_notification.v1',
  'jira.oauth_dynamic_webhook.v1',
  'discord.interactions.v1'
] as const;

let presetActionKey = (preset: string) => `verify_preset_${preset.replaceAll('.', '_')}`;

let hmacPresetSecret = {
  source: 'registration',
  name: 'hmac_secret',
  registrationKey: 'hmacSecret',
  encoding: 'utf8'
};

let ed25519PresetSecret = {
  source: 'registration',
  name: 'ed25519_public_key',
  registrationKey: 'ed25519PublicKey',
  encoding: 'hex'
};

let freshness = (
  presetField: 'timestamp' | 'issued_at',
  format: 'unix_seconds' | 'unix_milliseconds' | 'rfc3339'
) => ({
  source: 'preset',
  presetField,
  format,
  maxAgeSeconds: 300,
  maxFutureSkewSeconds: 60
});

let presetDedupe = (
  presetField: 'event_id' | 'webhook_id' | 'interaction_id',
  scope: 'request' | 'verified_item' = 'request'
) => ({
  source: 'preset',
  presetField,
  ttlSeconds: 3_600,
  scope
});

let jsonEventDedupe = {
  source: 'json_pointer',
  pointer: '/event_id',
  ttlSeconds: 3_600,
  scope: 'request'
};

let nonGraphPresetCases = [
  {
    preset: 'stripe.v1',
    secretRef: hmacPresetSecret,
    replay: {
      kind: 'enforced',
      freshness: freshness('timestamp', 'unix_seconds'),
      deduplicate: presetDedupe('event_id')
    }
  },
  {
    preset: 'zoom.v0',
    secretRef: hmacPresetSecret,
    syncMatcher: {
      jsonBodyField: { path: '/event', equals: 'endpoint.url_validation' }
    },
    deliveryMatcher: { jsonBodyField: { path: '/event', equals: 'test.delivery' } },
    replay: {
      kind: 'enforced',
      freshness: freshness('timestamp', 'unix_seconds'),
      deduplicate: presetDedupe('event_id')
    }
  },
  {
    preset: 'hubspot.v3',
    secretRef: hmacPresetSecret,
    replay: {
      kind: 'enforced',
      freshness: freshness('timestamp', 'unix_milliseconds'),
      deduplicate: jsonEventDedupe
    }
  },
  {
    preset: 'gitlab.standard.v1',
    secretRef: hmacPresetSecret,
    replay: {
      kind: 'enforced',
      deduplicate: presetDedupe('event_id')
    }
  },
  {
    preset: 'zendesk.v1',
    secretRef: hmacPresetSecret,
    replay: {
      kind: 'enforced',
      freshness: freshness('timestamp', 'rfc3339'),
      deduplicate: jsonEventDedupe
    }
  },
  {
    preset: 'typeform.v1',
    secretRef: hmacPresetSecret,
    replay: {
      kind: 'enforced',
      deduplicate: presetDedupe('event_id')
    }
  },
  {
    preset: 'linear.v1',
    secretRef: hmacPresetSecret,
    replay: {
      kind: 'enforced',
      freshness: freshness('timestamp', 'unix_milliseconds'),
      deduplicate: presetDedupe('event_id')
    }
  },
  {
    preset: 'jira.oauth_dynamic_webhook.v1',
    secretRef: hmacPresetSecret,
    replay: {
      kind: 'enforced',
      freshness: freshness('issued_at', 'unix_seconds'),
      deduplicate: presetDedupe('webhook_id')
    }
  },
  {
    preset: 'discord.interactions.v1',
    secretRef: ed25519PresetSecret,
    syncMatcher: { jsonBodyField: { path: '/type', equals: '1' } },
    deliveryMatcher: { jsonBodyField: { path: '/type', equals: '2' } },
    replay: {
      kind: 'enforced',
      freshness: freshness('timestamp', 'unix_seconds'),
      deduplicate: presetDedupe('interaction_id')
    }
  }
] as const;

let expectedPresetInvocation = (testCase: (typeof nonGraphPresetCases)[number]) => {
  let bootstrapRule =
    'syncMatcher' in testCase
      ? [
          {
            id: 'bootstrap.v1',
            phase: 'bootstrap',
            when: { methods: ['POST'], matcher: testCase.syncMatcher },
            verify: { type: 'preset', preset: testCase.preset },
            result: { type: 'sync_only' },
            replay: { kind: 'not_applicable', reason: 'bootstrap_sync_only' }
          }
        ]
      : [];
  let deliveryWhen =
    'deliveryMatcher' in testCase
      ? { methods: ['POST'], matcher: testCase.deliveryMatcher }
      : { methods: ['POST'] };

  return {
    type: 'webhook',
    autoRegistration: true,
    autoUnregistration: false,
    http: {
      methods: ['POST'],
      ...('syncMatcher' in testCase
        ? { sync: { mode: 'match', match: [testCase.syncMatcher] } }
        : {}),
      ingress: {
        kind: 'receiver_route',
        baseline: 'receiver_path_secret',
        verification: {
          mechanism: 'hub',
          baseline: 'receiver_path_secret',
          allowedSecretRefs: [testCase.secretRef],
          rules: [
            ...bootstrapRule,
            {
              id: 'delivery.v1',
              phase: 'delivery',
              when: deliveryWhen,
              verify: { type: 'preset', preset: testCase.preset },
              result: { type: 'dispatch', scope: 'receiver_trigger' },
              replay: testCase.replay
            }
          ]
        }
      }
    }
  };
};

let slackActionKeys = [
  'verify_preset_slack_v0',
  'verify_slack_interactivity_v0',
  'verify_slack_slash_command_v0',
  'verify_slack_ssl_check_v0'
] as const;

let slackFreshness = {
  source: 'preset',
  presetField: 'timestamp',
  format: 'unix_seconds',
  maxAgeSeconds: 300,
  maxFutureSkewSeconds: 60
};

let slackRule = (
  id: string,
  phase: 'bootstrap' | 'delivery',
  matcher: Record<string, unknown>,
  options: { deduplicate?: boolean } = {}
) => ({
  id,
  phase,
  when: { methods: ['POST'], matcher },
  verify: { type: 'preset', preset: 'slack.v0' },
  result:
    phase === 'bootstrap'
      ? { type: 'sync_only' }
      : { type: 'dispatch', scope: 'receiver_trigger' },
  replay:
    phase === 'bootstrap'
      ? { kind: 'not_applicable', reason: 'bootstrap_sync_only' }
      : {
          kind: 'enforced',
          freshness: slackFreshness,
          ...(options.deduplicate
            ? {
                deduplicate: {
                  source: 'json_pointer',
                  pointer: '/event_id',
                  ttlSeconds: 604_800,
                  scope: 'request'
                }
              }
            : {})
        }
});

let expectedSlackInvocation = (
  syncMatcher: Record<string, unknown> | null,
  rules: Record<string, unknown>[]
) => ({
  type: 'webhook',
  autoRegistration: true,
  autoUnregistration: false,
  http: {
    methods: ['POST'],
    ...(syncMatcher ? { sync: { mode: 'match', match: [syncMatcher], timeoutMs: 1500 } } : {}),
    ingress: {
      kind: 'receiver_route',
      baseline: 'receiver_path_secret',
      verification: {
        mechanism: 'hub',
        baseline: 'receiver_path_secret',
        allowedSecretRefs: [hmacPresetSecret],
        rules
      }
    }
  }
});

let slackInvocationCases = [
  {
    actionKey: 'verify_preset_slack_v0',
    invocation: expectedSlackInvocation(
      { jsonBodyField: { path: 'type', equals: 'url_verification' } },
      [
        slackRule('slack.url_verification.v1', 'bootstrap', {
          jsonBodyField: { path: '/type', equals: 'url_verification' }
        }),
        slackRule(
          'slack.event_callback.v1',
          'delivery',
          { jsonBodyField: { path: '/type', equals: 'event_callback' } },
          { deduplicate: true }
        ),
        slackRule('slack.app_rate_limited.v1', 'delivery', {
          jsonBodyField: { path: '/type', equals: 'app_rate_limited' }
        })
      ]
    )
  },
  {
    actionKey: 'verify_slack_interactivity_v0',
    invocation: expectedSlackInvocation(null, [
      slackRule('slack.interactivity.v1', 'delivery', {
        formBodyField: { path: 'payload' }
      })
    ])
  },
  {
    actionKey: 'verify_slack_slash_command_v0',
    invocation: expectedSlackInvocation(null, [
      slackRule('slack.slash_command.v1', 'delivery', {
        formBodyField: { path: 'command' }
      })
    ])
  },
  {
    actionKey: 'verify_slack_ssl_check_v0',
    invocation: expectedSlackInvocation(null, [
      slackRule('slack.ssl_check.v1', 'bootstrap', {
        formBodyField: { path: 'ssl_check', equals: '1' }
      })
    ])
  }
] as const;

let graphActionKey = 'verify_preset_graph_change_notification_v1';
let graphActiveSecretRef = {
  source: 'registration',
  name: 'graph_client_state',
  registrationKey: 'clientState',
  encoding: 'utf8'
};
let graphRetiringSecretRef = {
  source: 'registration',
  name: 'graph_retiring_client_state',
  registrationKey: 'retiringClientState',
  encoding: 'utf8'
};

let providerTokenSecretRef = {
  source: 'registration',
  name: 'provider_token',
  registrationKey: 'providerToken',
  encoding: 'utf8'
};

let providerActionKey = (verifierId: string) =>
  `verify_provider_${verifierId.replaceAll('.', '_')}`;

let providerPresetDedupe = (
  presetField: 'event_id' | 'delivery_id',
  scope: 'request' | 'verified_item' = 'request'
) => ({
  source: 'preset',
  presetField,
  ttlSeconds: 3_600,
  scope
});

let providerCases = [
  {
    verifierId: 'quickbooks.delivery.v1',
    replay: {
      kind: 'enforced',
      deduplicate: providerPresetDedupe('event_id')
    }
  },
  {
    verifierId: 'kofi.delivery.v1',
    replay: {
      kind: 'enforced',
      deduplicate: providerPresetDedupe('event_id')
    }
  },
  {
    verifierId: 'braintree.delivery.v1',
    replay: {
      kind: 'enforced',
      deduplicate: providerPresetDedupe('delivery_id')
    }
  },
  {
    verifierId: 'paypal.delivery.v1',
    replay: {
      kind: 'enforced',
      deduplicate: providerPresetDedupe('event_id')
    }
  },
  {
    verifierId: 'notion.delivery.v1',
    replay: {
      kind: 'enforced',
      deduplicate: providerPresetDedupe('event_id')
    }
  },
  {
    verifierId: 'asana.delivery.v1',
    replay: {
      kind: 'enforced',
      deduplicate: providerPresetDedupe('event_id')
    }
  },
  {
    verifierId: 'cursor.delivery.v1',
    replay: {
      kind: 'enforced',
      deduplicate: providerPresetDedupe('event_id')
    }
  },
  {
    verifierId: 'google_calendar.delivery.v1',
    replay: {
      kind: 'enforced',
      deduplicate: providerPresetDedupe('event_id')
    }
  },
  {
    verifierId: 'graph.change_notification.provider.v1',
    replay: {
      kind: 'enforced',
      deduplicate: providerPresetDedupe('delivery_id', 'verified_item')
    }
  },
  {
    verifierId: 'meta.delivery.v1',
    replay: {
      kind: 'enforced',
      deduplicate: providerPresetDedupe('event_id')
    }
  },
  {
    verifierId: 'zoom.delivery.v1',
    replay: {
      kind: 'enforced',
      freshness: freshness('timestamp', 'unix_seconds'),
      deduplicate: providerPresetDedupe('event_id')
    }
  }
] as const;

let providerBoundaryReason =
  'Synthetic provider-boundary fixture only; it does not claim vendor behavior or conformance.';

let expectedProviderInvocation = (testCase: (typeof providerCases)[number]) => {
  let graph = testCase.verifierId === 'graph.change_notification.provider.v1';
  return {
    type: 'webhook',
    autoRegistration: true,
    autoUnregistration: false,
    http: {
      methods: ['POST'],
      ingress: {
        kind: 'receiver_route',
        baseline: 'receiver_path_secret',
        verification: {
          mechanism: 'provider',
          baseline: 'receiver_path_secret',
          reason: providerBoundaryReason,
          allowedSecretRefs: graph
            ? [providerTokenSecretRef, graphActiveSecretRef, graphRetiringSecretRef]
            : [providerTokenSecretRef],
          rules: [
            {
              id: testCase.verifierId,
              phase: 'delivery',
              when: { methods: ['POST'] },
              verify: {
                type: 'provider',
                verifierId: testCase.verifierId,
                allowedSecretRefs: ['provider_token'],
                allowedBootstrapCaptureRefs: []
              },
              result: {
                type: 'dispatch',
                scope: graph ? 'verified_items' : 'receiver_trigger'
              },
              replay: testCase.replay
            }
          ]
        }
      }
    }
  };
};

let getGraphAction = () => {
  let action = provider.actions.find(candidate => candidate.key === graphActionKey);
  if (!action || action.type !== 'trigger' || !action.autoRegisterWebhook) {
    throw new Error('Expected the Graph preset action with automatic registration');
  }
  return action;
};

let invokeGraphRegistration = (registrationDetails?: unknown) => {
  let action = getGraphAction();
  return action.autoRegisterWebhook!(
    new SlateContext(
      {},
      {
        webhookBaseUrl:
          'https://callbacks.example.test/receiver-secret?existing=preserved&validationToken=stale',
        registrationDetails
      },
      {},
      spec,
      new SlateLogger([])
    ) as never
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Hub webhook verification contracts', () => {
  it('publishes the exact event type emitted by every test trigger', async () => {
    let actions = await serializeActions();
    let specialEventTypes = new Map([
      ['poll_time', 'test.poll.time'],
      ['webhook_echo', 'test.webhook.received'],
      ['webhook_sync_echo', 'test.webhook.sync_echo']
    ]);

    for (let action of actions) {
      expect(action.metadata?.eventTypes, action.id).toEqual([
        specialEventTypes.get(action.id) ?? `test.webhook.${action.id}`
      ]);
    }
  });

  it('publishes exactly one action for every canonical Hub preset ID', async () => {
    expect(SLATE_WEBHOOK_PRESET_IDS).toEqual(canonicalPresetIds);
    expect(Object.keys(SLATE_WEBHOOK_PRESET_DEFINITIONS)).toEqual(canonicalPresetIds);

    let actions = await serializeActions();
    let expectedActionKeys = canonicalPresetIds.map(presetActionKey);
    let actualActions = actions.filter(action => action.id.startsWith('verify_preset_'));
    let actualActionKeys = actualActions.map(action => action.id);
    let actualPresetIds = actualActions.flatMap(action => {
      let invocation = action.invocation;
      if (invocation.type !== 'webhook' || !invocation.http) return [];
      let verification = invocation.http.ingress?.verification;
      if (!verification || !('rules' in verification)) return [];
      return [
        ...new Set(
          verification.rules.flatMap(rule =>
            rule.verify.type === 'preset' ? [rule.verify.preset] : []
          )
        )
      ];
    });

    expect(actualActionKeys).toEqual(expectedActionKeys);
    expect(actualPresetIds).toEqual(SLATE_WEBHOOK_PRESET_IDS);
  });

  it('publishes the specialized Slack action family exactly once without changing canonical preset count', async () => {
    let actions = await serializeActions();
    let actualSlackKeys = actions
      .map(action => action.id)
      .filter(actionKey =>
        slackActionKeys.includes(actionKey as (typeof slackActionKeys)[number])
      );

    expect(canonicalPresetIds).toHaveLength(SLATE_WEBHOOK_PRESET_IDS.length);
    expect(actualSlackKeys).toEqual(slackActionKeys);
    for (let actionKey of slackActionKeys) {
      expect(actions.filter(action => action.id === actionKey)).toHaveLength(1);
    }
  });

  it('serializes the exact Slack matcher, replay, and dispatch contracts', async () => {
    let actions = await serializeActions();

    for (let testCase of slackInvocationCases) {
      let action = actions.find(candidate => candidate.id === testCase.actionKey);
      expect(action?.invocation, testCase.actionKey).toEqual(testCase.invocation);
    }
  });

  it('publishes one exact extended echo schema for every Slack request family', async () => {
    let actions = await serializeActions();
    let slackActions = slackActionKeys.map(actionKey =>
      actions.find(candidate => candidate.id === actionKey)
    );

    expect(slackActions.every(Boolean)).toBe(true);
    for (let action of slackActions) {
      expect(action?.inputSchema).toEqual(slackActions[0]?.inputSchema);
      expect(action?.outputSchema).toEqual(action?.inputSchema);
    }

    expect(slackActions[0]?.inputSchema).toMatchObject({
      type: 'object',
      properties: {
        receivedAt: { type: 'string' },
        method: { type: 'string' },
        url: { type: 'string' },
        headers: { type: 'object' },
        payload: { type: 'object' },
        slack: {
          type: 'object',
          properties: {
            requestFamily: {
              type: 'string',
              enum: ['events_api', 'interactivity', 'slash_command', 'ssl_check']
            },
            payloadType: { type: 'string' },
            sourceId: { type: 'string' },
            rawBodySha256: { type: 'string' },
            retry: {
              anyOf: [
                {
                  type: 'object',
                  properties: {
                    number: { type: 'number' },
                    reason: { type: 'string' }
                  },
                  required: ['number'],
                  additionalProperties: false
                },
                { type: 'null' }
              ]
            }
          },
          required: ['requestFamily', 'payloadType', 'sourceId', 'rawBodySha256', 'retry'],
          additionalProperties: false
        }
      },
      required: ['receivedAt', 'method', 'url', 'headers', 'payload', 'slack'],
      additionalProperties: false
    });
  });

  it('registers all Slack actions with the exact fixed secret as an unversioned capture', async () => {
    for (let actionKey of slackActionKeys) {
      let action = provider.actions.find(candidate => candidate.key === actionKey);
      if (!action || action.type !== 'trigger' || !action.autoRegisterWebhook) {
        throw new Error(`Expected ${actionKey} to auto-register`);
      }
      let result = await action.autoRegisterWebhook(
        new SlateContext(
          {},
          {
            webhookBaseUrl: 'https://callbacks.example.test/receiver-secret'
          },
          {},
          spec,
          new SlateLogger([])
        ) as never
      );

      expect(result).toEqual({
        registrationDetails: { credentialSecretName: 'hmac_secret' },
        capturedSecrets: {
          hmac_secret: TEST_HMAC_SECRET
        }
      });
    }
  });

  it('serializes the exact non-Graph preset replay and bootstrap matrix', async () => {
    let actions = await serializeActions();

    for (let testCase of nonGraphPresetCases) {
      let action = actions.find(
        (candidate: SlatesAction) => candidate.id === presetActionKey(testCase.preset)
      );
      expect(action?.invocation, testCase.preset).toEqual(expectedPresetInvocation(testCase));
    }
  });

  it('registers every non-Graph preset with registration-backed fixed test credentials', async () => {
    let manager = await createProviderHandler(provider, []).run();
    for (let message of [
      {
        jsonrpc: '2.0' as const,
        method: 'slates/hello' as const,
        params: { protocol: SLATES_PROTOCOL_VERSION }
      },
      {
        jsonrpc: '2.0' as const,
        method: 'slates/participant.set' as const,
        params: { participants: [{ type: 'hub' as const, id: 'hub', name: 'Hub' }] }
      },
      {
        jsonrpc: '2.0' as const,
        method: 'slates/config.set' as const,
        params: { config: {} }
      },
      {
        jsonrpc: '2.0' as const,
        method: 'slates/session.start' as const,
        params: { sessionId: 'session', state: {} }
      }
    ]) {
      await SlatesProviderProtoHandlerManager.handleInput(manager, message);
    }

    for (let testCase of nonGraphPresetCases) {
      let secretName =
        testCase.preset === 'discord.interactions.v1' ? 'ed25519_public_key' : 'hmac_secret';
      let credentialValue =
        testCase.preset === 'discord.interactions.v1'
          ? TEST_ED25519_PUBLIC_KEY_HEX
          : TEST_HMAC_SECRET;
      let response = await SlatesProviderProtoHandlerManager.handleInput(manager, {
        jsonrpc: '2.0',
        id: `register-${testCase.preset}`,
        method: 'slates/action.trigger.webhook_register',
        params: {
          actionId: presetActionKey(testCase.preset),
          webhookBaseUrl: 'https://callbacks.example.test/receiver-secret'
        }
      });
      if (!response || !('result' in response)) {
        throw new Error(`Registration failed for ${testCase.preset}`);
      }

      expect(response.result.capturedSecrets).toEqual({
        [secretName]: credentialValue
      });
      expect(response.result.registrationDetails).toEqual({
        credentialSecretName: secretName
      });
      expect(JSON.stringify(response.result.registrationDetails)).not.toContain(
        credentialValue
      );
    }
  });

  it('serializes the exact Graph bootstrap, authority, and verified-item replay contract', async () => {
    let actions = await serializeActions();
    let action = actions.find((candidate: SlatesAction) => candidate.id === graphActionKey);

    expect(action?.invocation).toEqual({
      type: 'webhook',
      autoRegistration: true,
      autoUnregistration: false,
      http: {
        methods: ['POST'],
        sync: {
          mode: 'match',
          match: [{ hasQueryParam: 'validationToken' }]
        },
        ingress: {
          kind: 'receiver_route',
          baseline: 'receiver_path_secret',
          verification: {
            mechanism: 'hub',
            baseline: 'receiver_path_secret',
            allowedSecretRefs: [graphActiveSecretRef, graphRetiringSecretRef],
            rules: [
              {
                id: 'graph.bootstrap.v1',
                phase: 'bootstrap',
                when: {
                  methods: ['POST'],
                  registrationStatuses: ['pending', 'registering', 'renewing'],
                  matcher: { hasQueryParam: 'validationToken' }
                },
                verify: { type: 'path_secret' },
                result: { type: 'sync_only' },
                replay: { kind: 'not_applicable', reason: 'bootstrap_sync_only' }
              },
              {
                id: 'graph.delivery.v1',
                phase: 'delivery',
                when: {
                  methods: ['POST'],
                  registrationStatuses: ['registered', 'renewing'],
                  matcher: {
                    lacksQueryParam: 'validationToken',
                    jsonBodyField: { path: '/value' }
                  }
                },
                verify: { type: 'preset', preset: 'graph.change_notification.v1' },
                result: { type: 'dispatch', scope: 'verified_items' },
                replay: {
                  kind: 'enforced',
                  deduplicate: {
                    source: 'preset',
                    presetField: 'delivery_id',
                    ttlSeconds: 3_600,
                    scope: 'verified_item'
                  }
                }
              }
            ]
          }
        }
      }
    });
  });

  it('registers named Graph active and retiring bindings after an exact echo', async () => {
    let requestedUrls: URL[] = [];
    let fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      let url = new URL(input instanceof Request ? input.url : input.toString());
      requestedUrls.push(url);
      expect(init?.method).toBe('POST');
      expect(url.searchParams.getAll('validationToken')).toHaveLength(1);
      return new Response(url.searchParams.get('validationToken'), {
        status: 200,
        headers: { 'content-type': 'text/plain' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    let initial = await invokeGraphRegistration();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestedUrls[0]?.searchParams.get('existing')).toBe('preserved');
    expect(initial.capturedSecrets).toEqual({
      graph_client_state: 'test-graph-client-state-v1',
      graph_retiring_client_state: 'test-graph-client-state-v2'
    });
    expect(initial.registrationDetails).toMatchObject({
      subscriptionId: 'test-graph-subscription-v1',
      resource: 'test-graph-resource',
      clientStateSecretName: 'graph_client_state',
      retiringSubscriptionId: 'test-graph-subscription-v1',
      retiringResource: 'test-graph-resource',
      retiringClientStateSecretName: 'graph_retiring_client_state',
      subscriptions: [
        {
          subscriptionId: 'test-graph-subscription-v1',
          resource: 'test-graph-resource',
          clientStateSecretName: 'graph_client_state'
        },
        {
          subscriptionId: 'test-graph-subscription-v1',
          resource: 'test-graph-resource',
          clientStateSecretName: 'graph_retiring_client_state'
        }
      ]
    });
    expect(new Date(initial.registrationDetails.retiringValidUntil).getTime()).toBeGreaterThan(
      Date.now()
    );
    expect(JSON.stringify(initial.registrationDetails)).not.toContain(
      'test-graph-client-state-v1'
    );

    let renewed = await invokeGraphRegistration(initial.registrationDetails);
    expect(renewed.capturedSecrets).toEqual({
      graph_client_state: 'test-graph-client-state-v1',
      graph_retiring_client_state: 'test-graph-client-state-v2'
    });
    expect(renewed.registrationDetails).toMatchObject({
      subscriptionId: 'test-graph-subscription-v1',
      retiringSubscriptionId: 'test-graph-subscription-v1',
      subscriptions: [
        {
          subscriptionId: 'test-graph-subscription-v1',
          clientStateSecretName: 'graph_client_state'
        },
        {
          subscriptionId: 'test-graph-subscription-v1',
          clientStateSecretName: 'graph_retiring_client_state'
        }
      ]
    });
    expect(JSON.stringify(renewed.registrationDetails)).not.toContain(
      'test-graph-client-state-v1'
    );
    expect(JSON.stringify(renewed.registrationDetails)).not.toContain(
      'test-graph-client-state-v2'
    );
  });

  it('rejects failed Graph validation echoes', async () => {
    let fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    fetchMock.mockResolvedValueOnce(new Response('validation-token', { status: 201 }));
    await expect(invokeGraphRegistration()).rejects.toThrow(/status 200/i);

    fetchMock.mockResolvedValueOnce(new Response('wrong-echo', { status: 200 }));
    await expect(invokeGraphRegistration()).rejects.toThrow(/exact validation token/i);
  });

  it('pairs reconstructed non-contiguous Graph values with selected candidates by position', async () => {
    let action = getGraphAction();
    if (!action.handleRequest) throw new Error('Expected the Graph request mapper');

    let result = await action.handleRequest(
      new SlateContext(
        {},
        {
          request: new Request('https://callbacks.example.test/receiver-secret', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              authorization: 'Bearer graph-request-secret',
              'x-neutral': 'safe'
            },
            body: JSON.stringify({
              value: [
                {
                  id: 'delivery-original-1',
                  subscriptionId: 'subscription-1',
                  clientState: 'client-state-1',
                  resource: '/resource/1'
                },
                {
                  id: 'delivery-original-3',
                  subscriptionId: 'subscription-3',
                  clientState: 'client-state-3',
                  resource: '/resource/3'
                }
              ]
            })
          }),
          selectedItems: [
            {
              candidateId: 'graph.body_value.v1:1:candidate-one',
              index: 1,
              bindingHash: 'a'.repeat(64),
              deliveryIds: ['delivery-original-1']
            },
            {
              candidateId: 'graph.body_value.v1:3:candidate-three',
              index: 3,
              bindingHash: 'b'.repeat(64),
              deliveryIds: ['delivery-original-3']
            }
          ]
        },
        {},
        spec,
        new SlateLogger([])
      ) as never
    );

    expect(result.inputs).toEqual([
      {
        candidateId: 'graph.body_value.v1:1:candidate-one',
        receivedAt: expect.any(String),
        method: 'POST',
        url: 'https://callbacks.example.test/:receiver-secret',
        headers: {
          authorization: '[redacted]',
          'content-type': 'application/json',
          'x-neutral': 'safe'
        },
        payload: {
          id: 'delivery-original-1',
          subscriptionId: 'subscription-1',
          clientState: '[redacted]',
          resource: '/resource/1'
        }
      },
      {
        candidateId: 'graph.body_value.v1:3:candidate-three',
        receivedAt: expect.any(String),
        method: 'POST',
        url: 'https://callbacks.example.test/:receiver-secret',
        headers: {
          authorization: '[redacted]',
          'content-type': 'application/json',
          'x-neutral': 'safe'
        },
        payload: {
          id: 'delivery-original-3',
          subscriptionId: 'subscription-3',
          clientState: '[redacted]',
          resource: '/resource/3'
        }
      }
    ]);
    expect(result.inputs.map(input => input.candidateId)).toEqual([
      'graph.body_value.v1:1:candidate-one',
      'graph.body_value.v1:3:candidate-three'
    ]);
  });

  it('publishes exactly one synthetic boundary action for every provider verifier ID', async () => {
    let actions = await serializeActions();
    let providerActions = actions.filter(action => action.id.startsWith('verify_provider_'));
    let providerVerifierIds = providerActions.flatMap(action => {
      let verification =
        action.invocation.type === 'webhook'
          ? action.invocation.http?.ingress?.verification
          : undefined;
      if (!verification || verification.mechanism !== 'provider') return [];
      return verification.rules.map(rule => rule.verify.verifierId);
    });

    expect(providerActions.map(action => action.id)).toEqual(
      SLATE_WEBHOOK_PROVIDER_VERIFIER_IDS.map(providerActionKey)
    );
    expect(providerVerifierIds).toHaveLength(SLATE_WEBHOOK_PROVIDER_VERIFIER_IDS.length);
    expect(new Set(providerVerifierIds)).toEqual(new Set(SLATE_WEBHOOK_PROVIDER_VERIFIER_IDS));
  });

  it('serializes the exact provider-boundary authority, replay, and selection matrix', async () => {
    let actions = await serializeActions();

    for (let testCase of providerCases) {
      let action = actions.find(
        candidate => candidate.id === providerActionKey(testCase.verifierId)
      );
      expect(action?.invocation, testCase.verifierId).toEqual(
        expectedProviderInvocation(testCase)
      );

      let serialized = JSON.stringify(action);
      expect(serialized).not.toContain(TEST_PROVIDER_TOKEN);
      expect(serialized).not.toContain('"source":"config"');
      expect(serialized).not.toContain('vendor-conformance');
    }
  });

  it('registers provider tokens and Graph authority without a preset-only self-probe', async () => {
    let fetchMock = vi.fn(async () => {
      throw new Error(
        'Provider Graph registration must not self-probe a delivery-only action'
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    let manager = await createProviderHandler(provider, []).run();
    for (let message of [
      {
        jsonrpc: '2.0' as const,
        method: 'slates/hello' as const,
        params: { protocol: SLATES_PROTOCOL_VERSION }
      },
      {
        jsonrpc: '2.0' as const,
        method: 'slates/participant.set' as const,
        params: { participants: [{ type: 'hub' as const, id: 'hub', name: 'Hub' }] }
      },
      {
        jsonrpc: '2.0' as const,
        method: 'slates/config.set' as const,
        params: { config: {} }
      },
      {
        jsonrpc: '2.0' as const,
        method: 'slates/session.start' as const,
        params: { sessionId: 'provider-registration-session', state: {} }
      }
    ]) {
      await SlatesProviderProtoHandlerManager.handleInput(manager, message);
    }

    for (let testCase of providerCases) {
      let graph = testCase.verifierId === 'graph.change_notification.provider.v1';
      let response = await SlatesProviderProtoHandlerManager.handleInput(manager, {
        jsonrpc: '2.0',
        id: `register-${testCase.verifierId}`,
        method: 'slates/action.trigger.webhook_register',
        params: {
          actionId: providerActionKey(testCase.verifierId),
          webhookBaseUrl: 'https://callbacks.example.test/receiver-secret'
        }
      });
      if (!response || !('result' in response)) {
        throw new Error(`Registration failed for ${testCase.verifierId}`);
      }

      expect(response.result.capturedSecrets.provider_token).toBe(TEST_PROVIDER_TOKEN);
      if (graph) {
        expect(response.result.capturedSecrets).toEqual({
          provider_token: TEST_PROVIDER_TOKEN,
          graph_client_state: getTestGraphClientState(1),
          graph_retiring_client_state: getTestGraphClientState(2)
        });
      } else {
        expect(response.result.capturedSecrets).toEqual({
          provider_token: TEST_PROVIDER_TOKEN
        });
        expect(response.result.registrationDetails).toEqual({
          credentialSecretName: 'provider_token'
        });
      }

      let registrationMetadata = JSON.stringify(response.result.registrationDetails);
      expect(registrationMetadata).not.toContain(TEST_PROVIDER_TOKEN);
      if (graph) {
        expect(registrationMetadata).not.toContain(getTestGraphClientState(1));
        expect(registrationMetadata).not.toContain(getTestGraphClientState(2));
      }
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    { payload: { event_id: 'event-snake' }, expected: 'event-snake' },
    { payload: { delivery_id: 'delivery-snake' }, expected: 'delivery-snake' },
    { payload: { webhookId: 'webhook-camel' }, expected: 'webhook-camel' },
    { payload: { id: 'generic-id' }, expected: 'generic-id' },
    { payload: { event_ts: 1_700_000_000 }, expected: '1700000000' }
  ])('uses the accepted request identity from $payload', ({ payload, expected }) => {
    let event = mapWebhookVerificationEvent('identity-test', {
      receivedAt: '2026-08-18T00:00:00.000Z',
      method: 'POST',
      url: 'https://callbacks.example.test/:receiver-secret',
      headers: {},
      payload
    });

    expect(event.id).toBe(`identity-test-${expected}`);
  });

  it('serializes exact static-token selector and replay declarations', async () => {
    let actions = await serializeActions();
    let cases = [
      {
        key: 'verify_static_header',
        selector: { source: 'header', headerName: 'x-test-api-key' }
      },
      {
        key: 'verify_static_query',
        selector: { source: 'query', queryParam: 'api_key' }
      },
      {
        key: 'verify_static_json',
        selector: { source: 'json_pointer', pointer: '/api_key' }
      }
    ];

    for (let testCase of cases) {
      let action = actions.find((candidate: SlatesAction) => candidate.id === testCase.key);
      expect(action?.invocation).toEqual(
        expectedInvocation([staticTokenSecret], {
          type: 'static_token',
          secretName: 'static_token',
          selector: testCase.selector
        })
      );
    }
  });

  it('serializes the exact raw HMAC verifier and replay declaration', async () => {
    let actions = await serializeActions();
    let action = actions.find((candidate: SlatesAction) => candidate.id === 'verify_raw_hmac');

    expect(action?.invocation).toEqual(
      expectedInvocation(
        [
          {
            source: 'registration',
            name: 'hmac_secret',
            registrationKey: 'hmacSecret',
            encoding: 'utf8'
          }
        ],
        {
          type: 'raw_hmac',
          secretName: 'hmac_secret',
          algorithm: 'sha256',
          signature: {
            headerName: 'x-test-signature',
            encoding: 'hex',
            duplicateHeaderPolicy: 'reject',
            multipleSignaturePolicy: 'reject'
          },
          message: [{ source: 'body' }]
        }
      )
    );
  });

  it('serializes the exact Ed25519 verifier and replay declaration', async () => {
    let actions = await serializeActions();
    let action = actions.find((candidate: SlatesAction) => candidate.id === 'verify_ed25519');

    expect(action?.invocation).toEqual(
      expectedInvocation(
        [
          {
            source: 'registration',
            name: 'ed25519_public_key',
            registrationKey: 'ed25519PublicKey',
            encoding: 'hex'
          }
        ],
        {
          type: 'ed25519',
          publicKeyName: 'ed25519_public_key',
          publicKeyEncoding: 'hex',
          signature: {
            headerName: 'x-test-ed25519-signature',
            encoding: 'hex',
            duplicateHeaderPolicy: 'reject',
            multipleSignaturePolicy: 'reject'
          },
          message: [{ source: 'header', headerName: 'x-test-timestamp' }, { source: 'body' }]
        }
      )
    );
  });

  it('exports the documented deterministic test credentials for request tooling', () => {
    expect({
      TEST_STATIC_TOKEN,
      TEST_HMAC_SECRET,
      TEST_PROVIDER_TOKEN,
      TEST_ED25519_PRIVATE_SEED_HEX,
      TEST_ED25519_PUBLIC_KEY_HEX
    }).toEqual({
      TEST_STATIC_TOKEN: 'test-static-token-v1',
      TEST_HMAC_SECRET: 'test-hmac-secret-v1',
      TEST_PROVIDER_TOKEN: 'test-provider-token-v1',
      TEST_ED25519_PRIVATE_SEED_HEX:
        '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
      TEST_ED25519_PUBLIC_KEY_HEX:
        '03a107bff3ce10be1d70dd18e74bc09967e4d6309ba50d5f1ddc8664125531b8'
    });
  });

  it('registers each core action with its exact fixed unversioned credential', async () => {
    let manager = await createProviderHandler(provider, []).run();
    for (let message of [
      {
        jsonrpc: '2.0' as const,
        method: 'slates/hello' as const,
        params: { protocol: SLATES_PROTOCOL_VERSION }
      },
      {
        jsonrpc: '2.0' as const,
        method: 'slates/participant.set' as const,
        params: { participants: [{ type: 'hub' as const, id: 'hub', name: 'Hub' }] }
      },
      {
        jsonrpc: '2.0' as const,
        method: 'slates/config.set' as const,
        params: { config: {} }
      },
      {
        jsonrpc: '2.0' as const,
        method: 'slates/session.start' as const,
        params: { sessionId: 'session', state: {} }
      }
    ]) {
      await SlatesProviderProtoHandlerManager.handleInput(manager, message);
    }

    let cases = [
      {
        actionId: 'verify_static_header',
        secretName: 'static_token',
        value: TEST_STATIC_TOKEN
      },
      {
        actionId: 'verify_static_query',
        secretName: 'static_token',
        value: TEST_STATIC_TOKEN
      },
      {
        actionId: 'verify_static_json',
        secretName: 'static_token',
        value: TEST_STATIC_TOKEN
      },
      {
        actionId: 'verify_raw_hmac',
        secretName: 'hmac_secret',
        value: TEST_HMAC_SECRET
      },
      {
        actionId: 'verify_ed25519',
        secretName: 'ed25519_public_key',
        value: TEST_ED25519_PUBLIC_KEY_HEX
      }
    ];

    for (let testCase of cases) {
      let response = await SlatesProviderProtoHandlerManager.handleInput(manager, {
        jsonrpc: '2.0',
        id: `register-${testCase.actionId}`,
        method: 'slates/action.trigger.webhook_register',
        params: {
          actionId: testCase.actionId,
          webhookBaseUrl: 'https://callbacks.example.test/receiver-secret'
        }
      });
      if (!response || !('result' in response)) {
        throw new Error(`Registration failed for ${testCase.actionId}`);
      }

      expect(response.result.capturedSecrets).toEqual({
        [testCase.secretName]: testCase.value
      });
      expect(response.result.registrationDetails).toEqual({
        credentialSecretName: testCase.secretName
      });
      expect(JSON.stringify(response.result.registrationDetails)).not.toContain(
        testCase.value
      );
    }
  });

  it('publishes one stable echo schema for every verification action', async () => {
    let actions = await serializeActions();
    let verificationActions = [
      'verify_static_header',
      'verify_static_query',
      'verify_static_json',
      'verify_raw_hmac',
      'verify_ed25519'
    ].map(key => actions.find((candidate: SlatesAction) => candidate.id === key));

    expect(verificationActions.every(Boolean)).toBe(true);
    for (let action of verificationActions) {
      expect(action?.inputSchema).toEqual(verificationActions[0]?.inputSchema);
      expect(action?.outputSchema).toEqual(action?.inputSchema);
      expect(action?.inputSchema).toMatchObject({
        type: 'object',
        properties: {
          receivedAt: { type: 'string' },
          method: { type: 'string' },
          url: { type: 'string' },
          headers: { type: 'object' },
          payload: { type: 'object' }
        },
        required: ['receivedAt', 'method', 'url', 'headers', 'payload'],
        additionalProperties: false
      });
    }
  });

  it('sanitizes fixed credentials before retaining a received request', async () => {
    let action = provider.actions.find(candidate => candidate.key === 'verify_static_header');
    expect(action?.type).toBe('trigger');
    if (!action || action.type !== 'trigger' || !action.handleRequest) {
      throw new Error('Expected verify_static_header to be a webhook trigger');
    }

    let securityHeaders = {
      authorization: 'Bearer authorization-secret',
      'x-test-api-key': TEST_STATIC_TOKEN,
      'x-test-provider-token': TEST_PROVIDER_TOKEN,
      'x-test-signature': TEST_HMAC_SECRET,
      'x-test-ed25519-signature': TEST_ED25519_PUBLIC_KEY_HEX,
      'x-test-timestamp': 'ed25519-timestamp-secret',
      'x-slack-signature': 'slack-signature-secret',
      'x-slack-request-timestamp': 'slack-timestamp-secret',
      'stripe-signature': 'stripe-signature-secret',
      'x-zm-signature': 'zoom-signature-secret',
      'x-zm-request-timestamp': 'zoom-timestamp-secret',
      'x-hubspot-signature-v3': 'hubspot-signature-secret',
      'x-hubspot-request-timestamp': 'hubspot-timestamp-secret',
      'x-gitlab-token': 'gitlab-token-secret',
      'x-zendesk-webhook-signature': 'zendesk-signature-secret',
      'x-zendesk-webhook-signature-timestamp': 'zendesk-timestamp-secret',
      'typeform-signature': 'typeform-signature-secret',
      'linear-signature': 'linear-signature-secret',
      'x-signature-ed25519': 'discord-signature-secret',
      'x-signature-timestamp': 'discord-timestamp-secret'
    };
    let neutralHeaders = {
      'x-neutral-credential-context': `before:${TEST_STATIC_TOKEN}:after`,
      'x-neutral-safe-context': 'safe-neutral-value'
    };
    let fixedRequestVisibleCredentialValues = [
      TEST_STATIC_TOKEN,
      TEST_HMAC_SECRET,
      TEST_PROVIDER_TOKEN,
      TEST_ED25519_PUBLIC_KEY_HEX,
      TEST_ED25519_PRIVATE_SEED_HEX
    ];
    for (let credentialValue of fixedRequestVisibleCredentialValues.slice(0, -1)) {
      expect(Object.values(securityHeaders)).toContain(credentialValue);
    }
    let requestResult = await action.handleRequest(
      new SlateContext(
        testConfig,
        {
          request: new Request(
            `https://callbacks.example.test/receiver-path-secret?api_key=${encodeURIComponent(TEST_STATIC_TOKEN)}&source=source-secret`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Mixed-Case': 'normalized',
                ...securityHeaders,
                ...neutralHeaders
              },
              body: JSON.stringify({
                event_id: 'evt-1',
                api_key: TEST_STATIC_TOKEN,
                credentialReference: TEST_HMAC_SECRET,
                nested: {
                  clientState: 'client-state-secret',
                  unchanged: 'safe-value',
                  providerContext: `before:${TEST_PROVIDER_TOKEN}:after`,
                  cryptoContext: {
                    publicKeyReference: TEST_ED25519_PUBLIC_KEY_HEX,
                    privateSeedContext: `seed:${TEST_ED25519_PRIVATE_SEED_HEX}:end`,
                    unchanged: 'safe-nested-value'
                  },
                  entries: [
                    {
                      verification_token: 'verification-token-secret',
                      token: 'token-secret',
                      secret: 'secret-secret',
                      ok: true
                    }
                  ]
                }
              })
            }
          ),
          state: null,
          registrationDetails: null
        },
        {},
        spec,
        new SlateLogger([])
      ) as never
    );

    expect(requestResult.inputs).toEqual([
      {
        receivedAt: expect.any(String),
        method: 'POST',
        url: 'https://callbacks.example.test/:receiver-secret',
        headers: {
          'content-type': 'application/json',
          'x-mixed-case': 'normalized',
          ...Object.fromEntries(
            Object.keys(securityHeaders).map(header => [header, '[redacted]'])
          ),
          'x-neutral-credential-context': 'before:[redacted]:after',
          'x-neutral-safe-context': 'safe-neutral-value'
        },
        payload: {
          event_id: 'evt-1',
          api_key: '[redacted]',
          credentialReference: '[redacted]',
          nested: {
            clientState: '[redacted]',
            unchanged: 'safe-value',
            providerContext: 'before:[redacted]:after',
            cryptoContext: {
              publicKeyReference: '[redacted]',
              privateSeedContext: 'seed:[redacted]:end',
              unchanged: 'safe-nested-value'
            },
            entries: [
              {
                verification_token: '[redacted]',
                token: '[redacted]',
                secret: '[redacted]',
                ok: true
              }
            ]
          }
        }
      }
    ]);
    expect(Number.isNaN(Date.parse(requestResult.inputs[0]!.receivedAt))).toBe(false);

    let input = requestResult.inputs[0]!;
    let serializedInput = JSON.stringify(input);
    for (let leakedValue of [
      'receiver-path-secret',
      'source-secret',
      ...fixedRequestVisibleCredentialValues,
      ...Object.values(securityHeaders),
      'client-state-secret',
      'verification-token-secret',
      'token-secret',
      'secret-secret'
    ]) {
      expect(serializedInput).not.toContain(leakedValue);
    }

    let event = await action.handleEvent(
      new SlateContext(testConfig, input, {}, spec, new SlateLogger([])) as never
    );
    expect(event.output).toEqual(input);
  });

  it('replaces malformed raw bodies with bounded non-secret metadata', async () => {
    let action = provider.actions.find(candidate => candidate.key === 'verify_raw_hmac');
    expect(action?.type).toBe('trigger');
    if (!action || action.type !== 'trigger' || !action.handleRequest) {
      throw new Error('Expected verify_raw_hmac to be a webhook trigger');
    }

    let malformedBody =
      'not-json authorization=Bearer malformed-secret&api_key=malformed-api-key';
    let result = await action.handleRequest(
      new SlateContext(
        testConfig,
        {
          request: new Request(
            'https://callbacks.example.test/malformed-path-secret?token=query-token-secret',
            {
              method: 'POST',
              headers: { 'content-type': 'text/plain' },
              body: malformedBody
            }
          ),
          state: null,
          registrationDetails: null
        },
        {},
        spec,
        new SlateLogger([])
      ) as never
    );

    expect(result.inputs[0]).toMatchObject({
      url: 'https://callbacks.example.test/:receiver-secret',
      payload: {
        malformedBody: {
          redacted: true,
          byteLength: new TextEncoder().encode(malformedBody).byteLength
        }
      }
    });
    expect(JSON.stringify(result.inputs[0])).not.toContain('malformed-secret');
    expect(JSON.stringify(result.inputs[0])).not.toContain('malformed-api-key');
    expect(JSON.stringify(result.inputs[0])).not.toContain('query-token-secret');
    expect(JSON.stringify(result.inputs[0])).not.toContain('malformed-path-secret');
  });
});
