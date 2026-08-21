import {
  SLATE_WEBHOOK_PROVIDER_VERIFIER_IDS,
  type SlateWebhookProviderVerifierId
} from '@slates/proto';
import {
  SlateTrigger,
  type SlateWebhookHttpOptions,
  type SlateWebhookProviderRule,
  type SlateWebhookReplayPolicy,
  type SlateWebhookSecretRef
} from 'slates';
import { spec } from '../../spec';
import {
  createGraphWebhookRegistrationAuthority,
  graphActiveSecretRef,
  graphRetiringSecretRef,
  graphWebhookVerificationEchoSchema,
  verifyPresetGraphChangeNotificationV1
} from './graph';
import {
  mapWebhookVerificationEvent,
  mapWebhookVerificationRequest,
  registerWebhookVerificationCredential,
  TEST_PROVIDER_TOKEN,
  verifyProviderBoundaryWebhook,
  webhookVerificationEchoSchema
} from './shared';

type RegistrationSecretRef = Extract<SlateWebhookSecretRef, { source: 'registration' }>;

type ProviderBoundaryDefinition = {
  verifierId: SlateWebhookProviderVerifierId;
  replay: SlateWebhookReplayPolicy;
};

export let providerTokenSecretRef: RegistrationSecretRef = {
  source: 'registration',
  name: 'provider_token',
  registrationKey: 'providerToken',
  encoding: 'utf8'
};

let presetDeduplicate = (
  presetField: 'event_id' | 'delivery_id',
  scope: 'request' | 'verified_item' = 'request'
) =>
  ({
    source: 'preset',
    presetField,
    ttlSeconds: 3_600,
    scope
  }) as const;

let providerFreshness = {
  source: 'preset',
  presetField: 'timestamp',
  format: 'unix_seconds',
  maxAgeSeconds: 300,
  maxFutureSkewSeconds: 60
} as const;

export let providerBoundaryDefinitions: readonly ProviderBoundaryDefinition[] = [
  {
    verifierId: 'quickbooks.delivery.v1',
    replay: {
      kind: 'enforced',
      deduplicate: presetDeduplicate('event_id')
    }
  },
  {
    verifierId: 'kofi.delivery.v1',
    replay: {
      kind: 'enforced',
      deduplicate: presetDeduplicate('event_id')
    }
  },
  {
    verifierId: 'braintree.delivery.v1',
    replay: {
      kind: 'enforced',
      deduplicate: presetDeduplicate('delivery_id')
    }
  },
  {
    verifierId: 'paypal.delivery.v1',
    replay: {
      kind: 'enforced',
      deduplicate: presetDeduplicate('event_id')
    }
  },
  {
    verifierId: 'notion.delivery.v1',
    replay: {
      kind: 'enforced',
      deduplicate: presetDeduplicate('event_id')
    }
  },
  {
    verifierId: 'asana.delivery.v1',
    replay: {
      kind: 'enforced',
      deduplicate: presetDeduplicate('event_id')
    }
  },
  {
    verifierId: 'cursor.delivery.v1',
    replay: {
      kind: 'enforced',
      deduplicate: presetDeduplicate('event_id')
    }
  },
  {
    verifierId: 'google_calendar.delivery.v1',
    replay: {
      kind: 'enforced',
      deduplicate: presetDeduplicate('event_id')
    }
  },
  {
    verifierId: 'graph.change_notification.provider.v1',
    replay: {
      kind: 'enforced',
      deduplicate: presetDeduplicate('delivery_id', 'verified_item')
    }
  },
  {
    verifierId: 'meta.delivery.v1',
    replay: {
      kind: 'enforced',
      deduplicate: presetDeduplicate('event_id')
    }
  },
  {
    verifierId: 'zoom.delivery.v1',
    replay: {
      kind: 'enforced',
      freshness: providerFreshness,
      deduplicate: presetDeduplicate('event_id')
    }
  }
];

export let getProviderBoundaryActionKey = (verifierId: SlateWebhookProviderVerifierId) =>
  `verify_provider_${verifierId.replaceAll('.', '_')}`;

let providerBoundaryReason =
  'Synthetic provider-boundary fixture only; it does not claim vendor behavior or conformance.';

let createProviderHttp = (definition: ProviderBoundaryDefinition): SlateWebhookHttpOptions => {
  let graph = definition.verifierId === 'graph.change_notification.provider.v1';
  let rule: SlateWebhookProviderRule = {
    id: definition.verifierId,
    phase: 'delivery',
    when: { methods: ['POST'] },
    verify: {
      type: 'provider',
      verifierId: definition.verifierId,
      allowedSecretRefs: [providerTokenSecretRef.name],
      allowedBootstrapCaptureRefs: []
    },
    result: {
      type: 'dispatch',
      scope: graph ? 'verified_items' : 'receiver_trigger'
    },
    replay: definition.replay
  };

  return {
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
        rules: [rule]
      }
    }
  };
};

let autoRegisterProviderToken = async () =>
  registerWebhookVerificationCredential({
    name: providerTokenSecretRef.name,
    value: TEST_PROVIDER_TOKEN
  });

let createNonGraphProviderAction = (definition: ProviderBoundaryDefinition) => {
  let key = getProviderBoundaryActionKey(definition.verifierId);
  return SlateTrigger.create(spec, {
    key,
    name: `Verify Provider ${definition.verifierId}`,
    description: `Exercises the synthetic provider boundary for ${definition.verifierId}.`,
    eventTypes: [`test.webhook.${key}`]
  })
    .input(webhookVerificationEchoSchema)
    .output(webhookVerificationEchoSchema)
    .webhook({
      http: createProviderHttp(definition),
      verifyWebhook: verifyProviderBoundaryWebhook,
      handleRequest: async ctx => ({
        inputs: [await mapWebhookVerificationRequest(ctx.request)]
      }),
      handleEvent: async ctx => mapWebhookVerificationEvent(key, ctx.input),
      autoRegisterWebhook: autoRegisterProviderToken
    })
    .build();
};

let createGraphProviderAction = (definition: ProviderBoundaryDefinition) => {
  let key = getProviderBoundaryActionKey(definition.verifierId);
  return SlateTrigger.create(spec, {
    key,
    name: `Verify Provider ${definition.verifierId}`,
    description: `Exercises the synthetic provider boundary for ${definition.verifierId}.`,
    eventTypes: [`test.webhook.${key}`]
  })
    .input(graphWebhookVerificationEchoSchema)
    .output(graphWebhookVerificationEchoSchema)
    .webhook({
      http: createProviderHttp(definition),
      verifyWebhook: verifyProviderBoundaryWebhook,
      handleRequest: async ctx =>
        verifyPresetGraphChangeNotificationV1.handleRequest!(ctx as never),
      handleEvent: async ctx => {
        let event = mapWebhookVerificationEvent(key, ctx.input);
        return { ...event, output: ctx.input };
      },
      autoRegisterWebhook: async ctx => {
        let providerRegistration = await autoRegisterProviderToken();
        let graphRegistration = createGraphWebhookRegistrationAuthority(ctx);
        return {
          ...graphRegistration,
          capturedSecrets: {
            ...providerRegistration.capturedSecrets,
            ...graphRegistration.capturedSecrets
          }
        };
      }
    })
    .build();
};

let definitionById = new Map(
  providerBoundaryDefinitions.map(definition => [definition.verifierId, definition])
);

export let providerBoundaryVerificationActions = SLATE_WEBHOOK_PROVIDER_VERIFIER_IDS.map(
  verifierId => {
    let definition = definitionById.get(verifierId);
    if (!definition) {
      throw new Error(`Missing synthetic provider boundary definition for ${verifierId}`);
    }
    return verifierId === 'graph.change_notification.provider.v1'
      ? createGraphProviderAction(definition)
      : createNonGraphProviderAction(definition);
  }
);
