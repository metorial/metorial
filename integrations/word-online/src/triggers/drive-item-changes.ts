import { randomBytes } from 'node:crypto';
import {
  buildApiServiceError,
  getGraphWebhookValidationResponse,
  SlateTrigger,
  type SlateWebhookHttpOptions
} from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let wordGraphWebhookHttp = {
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
      allowedSecretRefs: [
        {
          source: 'registration',
          name: 'graph_client_state',
          registrationKey: 'clientState',
          encoding: 'utf8'
        },
        {
          source: 'registration',
          name: 'graph_retiring_client_state',
          registrationKey: 'retiringClientState',
          encoding: 'utf8'
        }
      ],
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
              ttlSeconds: 604_800,
              scope: 'verified_item'
            }
          }
        }
      ]
    }
  }
} satisfies SlateWebhookHttpOptions;

type WordWebhookRegistrationDetails = {
  subscriptionId?: string;
  expirationDateTime?: string;
  resource?: string;
  clientState?: string;
  retiringSubscriptionId?: string;
  retiringClientState?: string;
  retiringValidUntil?: string;
};

type WordWebhookContext = {
  auth: { token: string };
  config: { driveId?: string; siteId?: string };
};

let deleteSubscription = async (client: Client, subscriptionId: string, message: string) => {
  try {
    await client.deleteSubscription(subscriptionId);
  } catch (error) {
    if ((error as any)?.response?.status !== 404 && (error as any)?.status !== 404) {
      throw buildApiServiceError(error, {
        providerLabel: 'Microsoft Graph',
        operation: 'delete webhook subscription',
        reason: 'word_online_webhook_error',
        fallbackMessage: message
      });
    }
  }
};

export let registerWordWebhook = async (
  ctx: WordWebhookContext & {
    input: {
      webhookBaseUrl: string;
      registrationDetails?: WordWebhookRegistrationDetails | null;
    };
  }
) => {
  let client = new Client({
    token: ctx.auth.token,
    driveId: ctx.config.driveId,
    siteId: ctx.config.siteId
  });

  let drivePath = ctx.config.driveId
    ? `/drives/${ctx.config.driveId}`
    : ctx.config.siteId
      ? `/sites/${ctx.config.siteId}/drive`
      : '/me/drive';
  let resource = `${drivePath}/root`;
  let prior = ctx.input.registrationDetails;
  if (prior?.retiringSubscriptionId && prior.retiringSubscriptionId !== prior.subscriptionId) {
    await deleteSubscription(
      client,
      prior.retiringSubscriptionId,
      'Microsoft Graph could not remove the expired webhook overlap'
    );
  }
  let clientState = randomBytes(32).toString('base64url');
  let subscription: Awaited<ReturnType<Client['createSubscription']>>;
  try {
    subscription = await client.createSubscription(
      ctx.input.webhookBaseUrl,
      resource,
      'updated',
      4230,
      clientState
    );
  } catch (error) {
    throw buildApiServiceError(error, {
      providerLabel: 'Microsoft Graph',
      operation: 'register webhook subscription',
      reason: 'word_online_webhook_error',
      fallbackMessage: 'Microsoft Graph could not register the Word webhook subscription'
    });
  }
  let retiringSubscriptionId = prior?.subscriptionId ?? subscription.subscriptionId;
  let retiringClientState = prior?.clientState ?? clientState;
  let retiringResource = prior?.resource ?? resource;
  let retiringValidUntil = prior
    ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
    : new Date(0).toISOString();
  let registrationDetails = {
    subscriptionId: subscription.subscriptionId,
    expirationDateTime: subscription.expirationDateTime,
    resource,
    clientState,
    clientStateSecretName: 'graph_client_state',
    retiringSubscriptionId,
    retiringClientState,
    retiringValidUntil,
    subscriptions: [
      {
        subscriptionId: subscription.subscriptionId,
        resource,
        clientStateSecretName: 'graph_client_state'
      },
      {
        subscriptionId: retiringSubscriptionId,
        resource: retiringResource,
        clientStateSecretName: 'graph_retiring_client_state',
        validUntil: retiringValidUntil
      }
    ]
  };
  let capturedSecrets = {
    graph_client_state: clientState,
    graph_retiring_client_state: retiringClientState
  };
  if (prior) return { registrationDetails, capturedSecrets };
  let deltaResult = await client.getDelta();
  return {
    registrationDetails,
    state: { deltaLink: deltaResult.deltaLink },
    capturedSecrets
  };
};

export let unregisterWordWebhook = async (
  ctx: WordWebhookContext & {
    input: { registrationDetails?: WordWebhookRegistrationDetails | null };
  }
) => {
  let client = new Client({
    token: ctx.auth.token,
    driveId: ctx.config.driveId,
    siteId: ctx.config.siteId
  });
  let details = ctx.input.registrationDetails;
  let subscriptionIds = [details?.subscriptionId, details?.retiringSubscriptionId].filter(
    (id, index, values): id is string => typeof id === 'string' && values.indexOf(id) === index
  );
  for (let subscriptionId of subscriptionIds) {
    await deleteSubscription(
      client,
      subscriptionId,
      'Microsoft Graph could not unregister the Word webhook subscription'
    );
  }
};

export let driveItemChanges = SlateTrigger.create(spec, {
  name: 'Drive Item Changes',
  key: 'drive_item_changes',
  description:
    'Triggers when files or folders are created, updated, or deleted in OneDrive or SharePoint. Uses Microsoft Graph webhook subscriptions with delta queries to detect specific changes.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('Type of change detected'),
      itemId: z.string().describe('The unique ID of the changed drive item'),
      name: z.string().describe('Name of the changed item'),
      isFolder: z.boolean().describe('Whether the item is a folder'),
      mimeType: z.string().optional().describe('MIME type of the file'),
      size: z.number().optional().describe('File size in bytes'),
      webUrl: z.string().optional().describe('URL to open in browser'),
      modifiedAt: z.string().optional().describe('ISO 8601 last modified timestamp'),
      modifiedBy: z.string().optional().describe('Display name of the last modifier'),
      parentPath: z.string().optional().describe('Path of the parent folder')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('The unique ID of the changed drive item'),
      name: z.string().describe('Name of the changed item'),
      changeType: z.string().describe('Type of change: "created", "updated", or "deleted"'),
      isFolder: z.boolean().describe('Whether the item is a folder'),
      mimeType: z.string().optional().describe('MIME type of the file'),
      size: z.number().optional().describe('File size in bytes'),
      webUrl: z.string().optional().describe('URL to open in browser'),
      modifiedAt: z.string().optional().describe('ISO 8601 last modified timestamp'),
      modifiedBy: z.string().optional().describe('Display name of the last modifier'),
      parentPath: z.string().optional().describe('Path of the parent folder')
    })
  )
  .webhook({
    http: wordGraphWebhookHttp,
    autoRegisterWebhook: registerWordWebhook,

    autoUnregisterWebhook: unregisterWordWebhook,

    handleRequest: async ctx => {
      let validation = getGraphWebhookValidationResponse(ctx.request);
      if (validation) return { inputs: [], response: validation };

      // Parse the notification payload
      let body = (await ctx.request.json()) as any;
      let notifications = body?.value || [];

      if (notifications.length === 0) {
        return { inputs: [] };
      }

      // Use delta query to get the actual changes
      let client = new Client({
        token: ctx.auth.token,
        driveId: ctx.config.driveId,
        siteId: ctx.config.siteId
      });

      let deltaLink = ctx.state?.deltaLink;
      let deltaResult = await client.getDelta(deltaLink || undefined);

      let inputs = deltaResult.items.map(item => {
        // Determine change type based on item properties
        let changeType: 'created' | 'updated' | 'deleted' = 'updated';
        if ((item as any).deleted) {
          changeType = 'deleted';
        } else if (item.createdAt === item.modifiedAt) {
          changeType = 'created';
        }

        return {
          changeType,
          itemId: item.itemId,
          name: item.name,
          isFolder: item.isFolder,
          mimeType: item.mimeType,
          size: item.size,
          webUrl: item.webUrl,
          modifiedAt: item.modifiedAt,
          modifiedBy: item.modifiedBy,
          parentPath: item.parentPath
        };
      });

      return {
        inputs,
        updatedState: {
          deltaLink: deltaResult.deltaLink
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `drive_item.${ctx.input.changeType}`,
        id: `${ctx.input.itemId}-${ctx.input.modifiedAt || Date.now()}`,
        output: {
          itemId: ctx.input.itemId,
          name: ctx.input.name,
          changeType: ctx.input.changeType,
          isFolder: ctx.input.isFolder,
          mimeType: ctx.input.mimeType,
          size: ctx.input.size,
          webUrl: ctx.input.webUrl,
          modifiedAt: ctx.input.modifiedAt,
          modifiedBy: ctx.input.modifiedBy,
          parentPath: ctx.input.parentPath
        }
      };
    }
  })
  .build();
