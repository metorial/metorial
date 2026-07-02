import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { spec } from '../spec';

export let modelRegistryTrigger = SlateTrigger.create(spec, {
  name: 'Model Registry Events',
  key: 'model_registry_events',
  description:
    'Triggered by model registry webhook events such as new model versions, stage transitions, and transition requests.'
})
  .input(
    z.object({
      event: z.string().describe('Event type (e.g., MODEL_VERSION_CREATED)'),
      webhookId: z.string().describe('Webhook ID that received this event'),
      modelName: z.string().optional().describe('Name of the registered model'),
      modelVersion: z.string().optional().describe('Model version number'),
      registrationTimestamp: z.string().optional().describe('Timestamp of the event'),
      rawPayload: z.any().describe('Raw event payload from the webhook')
    })
  )
  .output(
    z.object({
      modelName: z.string().describe('Registered model name'),
      modelVersion: z.string().optional().describe('Model version affected'),
      event: z.string().describe('Event type'),
      fromStage: z.string().optional().describe('Previous stage (for transitions)'),
      toStage: z.string().optional().describe('New stage (for transitions)'),
      requestedBy: z.string().optional().describe('User who initiated the action'),
      registrationTimestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new DatabricksClient({
        workspaceUrl: ctx.config.workspaceUrl,
        token: ctx.auth.token
      });

      let events = [
        'MODEL_VERSION_CREATED',
        'REGISTERED_MODEL_CREATED',
        'MODEL_VERSION_TRANSITIONED_TO_STAGING',
        'MODEL_VERSION_TRANSITIONED_TO_PRODUCTION',
        'MODEL_VERSION_TRANSITIONED_TO_ARCHIVED',
        'TRANSITION_REQUEST_TO_STAGING_CREATED',
        'TRANSITION_REQUEST_TO_PRODUCTION_CREATED',
        'TRANSITION_REQUEST_TO_ARCHIVED_CREATED',
        'MODEL_VERSION_TAG_SET'
      ];

      let result = await client.createRegistryWebhook({
        events,
        httpUrlSpec: {
          url: ctx.input.webhookBaseUrl,
          enableSslVerification: true
        },
        status: 'ACTIVE',
        description: 'Slates integration webhook'
      });

      return {
        registrationDetails: {
          webhookId: result.webhook?.id ?? result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new DatabricksClient({
        workspaceUrl: ctx.config.workspaceUrl,
        token: ctx.auth.token
      });

      let details = ctx.input.registrationDetails as any;
      if (details?.webhookId) {
        await client.deleteRegistryWebhook(details.webhookId);
      }
    },

    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!body?.event) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            event: body.event ?? '',
            webhookId: body.webhook_id ?? '',
            modelName: body.model_name,
            modelVersion: body.version,
            registrationTimestamp: body.timestamp ? String(body.timestamp) : undefined,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.rawPayload ?? {};
      let eventType = ctx.input.event.toLowerCase().replace(/_/g, '.');

      return {
        type: `model_registry.${eventType}`,
        id: `${ctx.input.webhookId}-${ctx.input.event}-${ctx.input.modelName ?? ''}-${ctx.input.modelVersion ?? ''}-${ctx.input.registrationTimestamp ?? Date.now()}`,
        output: {
          modelName: ctx.input.modelName ?? raw.model_name ?? '',
          modelVersion: ctx.input.modelVersion ?? raw.version,
          event: ctx.input.event,
          fromStage: raw.from_stage,
          toStage: raw.to_stage,
          requestedBy: raw.user_id ?? raw.request_user_id,
          registrationTimestamp: ctx.input.registrationTimestamp
        }
      };
    }
  })
  .build();
