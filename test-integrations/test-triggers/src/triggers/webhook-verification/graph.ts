import { randomUUID } from 'node:crypto';
import { SlateTrigger, type SlateWebhookSecretRef } from 'slates';
import { z } from 'zod';
import { spec } from '../../spec';
import {
  mapWebhookVerificationEvent,
  mapWebhookVerificationRequest,
  webhookVerificationEchoSchema
} from './shared';

type RegistrationSecretRef = Extract<SlateWebhookSecretRef, { source: 'registration' }>;

type GraphRegistrationDetails = {
  subscriptionId?: string;
  resource?: string;
  clientStateSecretName?: string;
  retiringSubscriptionId?: string;
  retiringResource?: string;
  retiringClientStateSecretName?: string;
  retiringValidUntil?: string;
};

type GraphSelectedItem = {
  candidateId: string;
  index: number;
  bindingHash: string;
  deliveryIds?: string[];
};

type GraphWebhookHandleInput = {
  request: Request;
  selectedItems?: GraphSelectedItem[];
};

export let TEST_GRAPH_RESOURCE = 'test-graph-resource';

export let getTestGraphClientState = (fixtureId: number) =>
  `test-graph-client-state-v${fixtureId}`;

export let getTestGraphSubscriptionId = (fixtureId: number) =>
  `test-graph-subscription-v${fixtureId}`;

export let getTestGraphValidationToken = () => `test-graph-validation-${randomUUID()}`;

export let graphActiveSecretRef: RegistrationSecretRef = {
  source: 'registration',
  name: 'graph_client_state',
  registrationKey: 'clientState',
  encoding: 'utf8'
};

export let graphRetiringSecretRef: RegistrationSecretRef = {
  source: 'registration',
  name: 'graph_retiring_client_state',
  registrationKey: 'retiringClientState',
  encoding: 'utf8'
};

export let graphWebhookVerificationEchoSchema = webhookVerificationEchoSchema.extend({
  candidateId: z.string()
});

let readPriorActiveAuthority = (value: unknown) => {
  if (value === null || typeof value !== 'object') return null;
  let details = value as GraphRegistrationDetails;
  if (typeof details.subscriptionId !== 'string') return null;
  return {
    subscriptionId: details.subscriptionId,
    resource: typeof details.resource === 'string' ? details.resource : TEST_GRAPH_RESOURCE
  };
};

type GraphRegistrationContext = {
  input: {
    registrationDetails?: unknown;
  };
};

export let createGraphWebhookRegistrationAuthority = (ctx: GraphRegistrationContext) => {
  let activeClientState = getTestGraphClientState(1);
  let retiringClientState = getTestGraphClientState(2);
  let subscriptionId = getTestGraphSubscriptionId(1);
  let priorActive = readPriorActiveAuthority(ctx.input.registrationDetails);
  let retiringSubscriptionId = priorActive?.subscriptionId ?? subscriptionId;
  let retiringResource = priorActive?.resource ?? TEST_GRAPH_RESOURCE;
  let retiringValidUntil = new Date(Date.now() + 5 * 60 * 1_000).toISOString();

  return {
    registrationDetails: {
      subscriptionId,
      resource: TEST_GRAPH_RESOURCE,
      clientStateSecretName: graphActiveSecretRef.name,
      retiringSubscriptionId,
      retiringResource,
      retiringClientStateSecretName: graphRetiringSecretRef.name,
      retiringValidUntil,
      subscriptions: [
        {
          subscriptionId,
          resource: TEST_GRAPH_RESOURCE,
          clientStateSecretName: graphActiveSecretRef.name
        },
        {
          subscriptionId: retiringSubscriptionId,
          resource: retiringResource,
          clientStateSecretName: graphRetiringSecretRef.name
        }
      ]
    },
    capturedSecrets: {
      [graphActiveSecretRef.name]: activeClientState,
      [graphRetiringSecretRef.name]: retiringClientState
    }
  };
};

export let autoRegisterGraphWebhook = async (
  ctx: GraphRegistrationContext & {
    input: GraphRegistrationContext['input'] & {
      webhookBaseUrl: string;
    };
    abortSignal?: AbortSignal;
  }
) => {
  let authority = createGraphWebhookRegistrationAuthority(ctx);
  let validationToken = getTestGraphValidationToken();
  let validationUrl = new URL(ctx.input.webhookBaseUrl);
  validationUrl.searchParams.delete('validationToken');
  validationUrl.searchParams.append('validationToken', validationToken);
  let response = await fetch(validationUrl, {
    method: 'POST',
    signal: ctx.abortSignal
  });
  if (response.status !== 200) {
    throw new Error(
      `Graph webhook validation expected status 200 but received ${response.status}`
    );
  }
  if ((await response.text()) !== validationToken) {
    throw new Error('Graph webhook validation did not return the exact validation token');
  }

  return authority;
};

let mapGraphWebhookRequest = async (input: GraphWebhookHandleInput) => {
  let selectedItems = input.selectedItems;
  if (!selectedItems) return { inputs: [] };

  let bodyText = await input.request.text();
  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new Error('Graph reconstructed request body is not valid JSON');
  }
  let values =
    body !== null && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>).value
      : undefined;
  if (!Array.isArray(values) || values.length !== selectedItems.length) {
    throw new Error(
      'Graph reconstructed request must contain exactly one value per selected item'
    );
  }

  let inputs = await Promise.all(
    selectedItems.map(async (selectedItem, selectedPosition) => {
      let value = values[selectedPosition];
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Graph reconstructed request contains an invalid value item');
      }
      let itemRequest = new Request(input.request.url, {
        method: input.request.method,
        headers: new Headers(input.request.headers),
        body: JSON.stringify(value)
      });
      return {
        candidateId: selectedItem.candidateId,
        ...(await mapWebhookVerificationRequest(itemRequest))
      };
    })
  );

  return { inputs };
};

export let verifyPresetGraphChangeNotificationV1 = SlateTrigger.create(spec, {
  key: 'verify_preset_graph_change_notification_v1',
  name: 'Verify Preset graph.change_notification.v1',
  description:
    'Receives Microsoft Graph webhook deliveries authenticated by deterministic synthetic registration authority.',
  eventTypes: ['test.webhook.verify_preset_graph_change_notification_v1']
})
  .input(graphWebhookVerificationEchoSchema)
  .output(graphWebhookVerificationEchoSchema)
  .webhook({
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
    },
    handleRequest: async ctx =>
      mapGraphWebhookRequest(ctx.input as unknown as GraphWebhookHandleInput),
    handleEvent: async ctx => {
      let event = mapWebhookVerificationEvent(
        'verify_preset_graph_change_notification_v1',
        ctx.input
      );
      return { ...event, output: ctx.input };
    },
    autoRegisterWebhook: autoRegisterGraphWebhook
  })
  .build();
