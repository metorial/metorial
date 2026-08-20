import {
  SlateTrigger,
  type SlateWebhookPresetId,
  type SlateWebhookReplayPolicy,
  type SlateWebhookRuleRequestMatcher,
  type SlateWebhookSecretRef,
  type SlateWebhookVerificationRule,
  slateWebhookPresetIds
} from 'slates';
import { spec } from '../../spec';
import { verifyPresetGraphChangeNotificationV1 } from './graph';
import {
  mapWebhookVerificationEvent,
  mapWebhookVerificationRequest,
  registerWebhookVerificationCredential,
  TEST_ED25519_PUBLIC_KEY_HEX,
  TEST_HMAC_SECRET,
  webhookVerificationEchoSchema
} from './shared';
import { verifyPresetSlackV0 } from './slack';

type RegistrationSecretRef = Extract<SlateWebhookSecretRef, { source: 'registration' }>;
type GenericPresetId = Exclude<
  SlateWebhookPresetId,
  'graph.change_notification.v1' | 'slack.v0'
>;

type PresetActionDefinition = {
  preset: GenericPresetId;
  secretRef: RegistrationSecretRef;
  credentialValue: string;
  replay: SlateWebhookReplayPolicy;
  syncMatcher?: SlateWebhookRuleRequestMatcher;
  deliveryMatcher?: SlateWebhookRuleRequestMatcher;
};

let hmacSecretRef: RegistrationSecretRef = {
  source: 'registration',
  name: 'hmac_secret',
  registrationKey: 'hmacSecret',
  encoding: 'utf8'
};

let ed25519PublicKeyRef: RegistrationSecretRef = {
  source: 'registration',
  name: 'ed25519_public_key',
  registrationKey: 'ed25519PublicKey',
  encoding: 'hex'
};

let freshness = (
  presetField: 'timestamp' | 'issued_at',
  format: 'unix_seconds' | 'unix_milliseconds' | 'rfc3339'
) =>
  ({
    source: 'preset',
    presetField,
    format,
    maxAgeSeconds: 300,
    maxFutureSkewSeconds: 60
  }) as const;

let presetDeduplicate = (presetField: 'event_id' | 'webhook_id' | 'interaction_id') =>
  ({
    source: 'preset',
    presetField,
    ttlSeconds: 3_600,
    scope: 'request'
  }) as const;

let jsonEventDeduplicate = {
  source: 'json_pointer',
  pointer: '/event_id',
  ttlSeconds: 3_600,
  scope: 'request'
} as const;

export let nonGraphPresetDefinitions: readonly PresetActionDefinition[] = [
  {
    preset: 'stripe.v1',
    secretRef: hmacSecretRef,
    credentialValue: TEST_HMAC_SECRET,
    replay: {
      kind: 'enforced',
      freshness: freshness('timestamp', 'unix_seconds'),
      deduplicate: presetDeduplicate('event_id')
    }
  },
  {
    preset: 'zoom.v0',
    secretRef: hmacSecretRef,
    credentialValue: TEST_HMAC_SECRET,
    syncMatcher: {
      jsonBodyField: { path: '/event', equals: 'endpoint.url_validation' }
    },
    deliveryMatcher: {
      jsonBodyField: { path: '/event', equals: 'test.delivery' }
    },
    replay: {
      kind: 'enforced',
      freshness: freshness('timestamp', 'unix_seconds'),
      deduplicate: presetDeduplicate('event_id')
    }
  },
  {
    preset: 'hubspot.v3',
    secretRef: hmacSecretRef,
    credentialValue: TEST_HMAC_SECRET,
    replay: {
      kind: 'enforced',
      freshness: freshness('timestamp', 'unix_milliseconds'),
      deduplicate: jsonEventDeduplicate
    }
  },
  {
    preset: 'gitlab.standard.v1',
    secretRef: hmacSecretRef,
    credentialValue: TEST_HMAC_SECRET,
    replay: {
      kind: 'enforced',
      deduplicate: presetDeduplicate('event_id')
    }
  },
  {
    preset: 'zendesk.v1',
    secretRef: hmacSecretRef,
    credentialValue: TEST_HMAC_SECRET,
    replay: {
      kind: 'enforced',
      freshness: freshness('timestamp', 'rfc3339'),
      deduplicate: jsonEventDeduplicate
    }
  },
  {
    preset: 'typeform.v1',
    secretRef: hmacSecretRef,
    credentialValue: TEST_HMAC_SECRET,
    replay: {
      kind: 'enforced',
      deduplicate: presetDeduplicate('event_id')
    }
  },
  {
    preset: 'linear.v1',
    secretRef: hmacSecretRef,
    credentialValue: TEST_HMAC_SECRET,
    replay: {
      kind: 'enforced',
      freshness: freshness('timestamp', 'unix_milliseconds'),
      deduplicate: presetDeduplicate('event_id')
    }
  },
  {
    preset: 'jira.oauth_dynamic_webhook.v1',
    secretRef: hmacSecretRef,
    credentialValue: TEST_HMAC_SECRET,
    replay: {
      kind: 'enforced',
      freshness: freshness('issued_at', 'unix_seconds'),
      deduplicate: presetDeduplicate('webhook_id')
    }
  },
  {
    preset: 'discord.interactions.v1',
    secretRef: ed25519PublicKeyRef,
    credentialValue: TEST_ED25519_PUBLIC_KEY_HEX,
    syncMatcher: { jsonBodyField: { path: '/type', equals: '1' } },
    deliveryMatcher: { jsonBodyField: { path: '/type', equals: '2' } },
    replay: {
      kind: 'enforced',
      freshness: freshness('timestamp', 'unix_seconds'),
      deduplicate: presetDeduplicate('interaction_id')
    }
  }
];

export let getPresetVerificationActionKey = (preset: SlateWebhookPresetId) =>
  `verify_preset_${preset.replaceAll('.', '_')}`;

let createPresetVerificationAction = (definition: PresetActionDefinition) => {
  let key = getPresetVerificationActionKey(definition.preset);
  let deliveryRule: SlateWebhookVerificationRule = {
    id: 'delivery.v1',
    phase: 'delivery',
    when: {
      methods: ['POST'],
      ...(definition.deliveryMatcher ? { matcher: definition.deliveryMatcher } : {})
    },
    verify: { type: 'preset', preset: definition.preset },
    result: { type: 'dispatch', scope: 'receiver_trigger' },
    replay: definition.replay
  };
  let rules: [SlateWebhookVerificationRule, ...SlateWebhookVerificationRule[]] =
    definition.syncMatcher
      ? [
          {
            id: 'bootstrap.v1',
            phase: 'bootstrap',
            when: { methods: ['POST'], matcher: definition.syncMatcher },
            verify: { type: 'preset', preset: definition.preset },
            result: { type: 'sync_only' },
            replay: { kind: 'not_applicable', reason: 'bootstrap_sync_only' }
          },
          deliveryRule
        ]
      : [deliveryRule];

  return SlateTrigger.create(spec, {
    key,
    name: `Verify Preset ${definition.preset}`,
    description: `Receives webhook deliveries authenticated by the ${definition.preset} Hub preset.`,
    eventTypes: [`test.webhook.${key}`]
  })
    .input(webhookVerificationEchoSchema)
    .output(webhookVerificationEchoSchema)
    .webhook({
      http: {
        methods: ['POST'],
        ...(definition.syncMatcher
          ? { sync: { mode: 'match', match: [definition.syncMatcher] } }
          : {}),
        ingress: {
          kind: 'receiver_route',
          baseline: 'receiver_path_secret',
          verification: {
            mechanism: 'hub',
            baseline: 'receiver_path_secret',
            allowedSecretRefs: [definition.secretRef],
            rules
          }
        }
      },
      handleRequest: async ctx => ({
        inputs: [await mapWebhookVerificationRequest(ctx.request)]
      }),
      handleEvent: async ctx => mapWebhookVerificationEvent(key, ctx.input),
      autoRegisterWebhook: async ctx =>
        registerWebhookVerificationCredential(ctx.input.capturedSecretVersions, {
          name: definition.secretRef.name,
          value: definition.credentialValue
        })
    })
    .build();
};

export let nonGraphPresetVerificationActions = nonGraphPresetDefinitions.map(
  createPresetVerificationAction
);

let nonGraphActionsByPreset = new Map(
  nonGraphPresetDefinitions.map((definition, index) => [
    definition.preset,
    nonGraphPresetVerificationActions[index]!
  ])
);

export let presetVerificationActions = slateWebhookPresetIds.map(preset =>
  preset === 'slack.v0'
    ? verifyPresetSlackV0
    : preset === 'graph.change_notification.v1'
      ? verifyPresetGraphChangeNotificationV1
      : nonGraphActionsByPreset.get(preset)!
);
