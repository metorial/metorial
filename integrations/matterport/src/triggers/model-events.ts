import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ALL_EVENT_TYPES = [
  'created',
  'deleted',
  'restored',
  'processed',
  'activation_state_changed',
  'visibility_changed',
  'details_changed',
  'transferred_in',
  'transferred_out',
  'bundle_updated'
] as const;

export let modelEvents = SlateTrigger.create(spec, {
  name: 'Model Events',
  key: 'model_events',
  description:
    'Receive real-time notifications for Matterport model lifecycle events including creation, deletion, processing, state changes, visibility changes, detail updates, transfers, and bundle updates. Requires Enterprise-level subscription.'
})
  .input(
    z.object({
      modelId: z.string().describe('ID of the model that triggered the event'),
      eventType: z.string().describe('Type of model event'),
      webhookId: z.string().optional().describe('ID of the webhook that delivered this event'),
      timestamp: z.string().optional().describe('Timestamp of the event'),
      version: z.number().optional().describe('Webhook version'),
      eventBody: z.any().optional().describe('Event-specific payload data')
    })
  )
  .output(
    z.object({
      modelId: z.string().describe('ID of the affected model'),
      eventTimestamp: z.string().nullable().optional().describe('When the event occurred'),
      previousState: z.string().nullable().optional().describe('Previous activation state'),
      currentState: z.string().nullable().optional().describe('Current activation state'),
      previousVisibility: z
        .string()
        .nullable()
        .optional()
        .describe('Previous visibility setting'),
      currentVisibility: z
        .string()
        .nullable()
        .optional()
        .describe('Current visibility setting'),
      creationType: z
        .string()
        .nullable()
        .optional()
        .describe('How the model was created (copy, demo, transfer, processing, unknown)'),
      processingStatus: z
        .string()
        .nullable()
        .optional()
        .describe('Processing result (succeeded, failed)'),
      processingError: z
        .string()
        .nullable()
        .optional()
        .describe('Processing error message if failed'),
      bundleStatus: z
        .string()
        .nullable()
        .optional()
        .describe('Bundle status (requested, delivered, canceled, failed)'),
      bundleId: z.string().nullable().optional().describe('ID of the affected bundle'),
      sourceOrganizationId: z
        .string()
        .nullable()
        .optional()
        .describe('Source organization for transfer_in events'),
      destinationOrganizationId: z
        .string()
        .nullable()
        .optional()
        .describe('Destination organization for transfer_out events')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        authType: ctx.auth.authType
      });

      let result = await client.registerWebhook(ctx.input.webhookBaseUrl, [
        ...ALL_EVENT_TYPES
      ]);

      return {
        registrationDetails: {
          webhookId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        authType: ctx.auth.authType
      });

      await client.unregisterWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      // Handle single event payload from Matterport webhook v2
      return {
        inputs: [
          {
            modelId: data.modelId as string,
            eventType: data.type as string,
            webhookId: data.webhookId as string | undefined,
            timestamp: data.timestamp as string | undefined,
            version: data.version as number | undefined,
            eventBody: data.body || {}
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { modelId, eventType, eventBody, timestamp } = ctx.input;
      let body = eventBody || {};

      let output: Record<string, any> = {
        modelId,
        eventTimestamp: timestamp || null,
        previousState: null,
        currentState: null,
        previousVisibility: null,
        currentVisibility: null,
        creationType: null,
        processingStatus: null,
        processingError: null,
        bundleStatus: null,
        bundleId: null,
        sourceOrganizationId: null,
        destinationOrganizationId: null
      };

      switch (eventType) {
        case 'activation_state_changed':
          output.previousState = body.previous?.state || null;
          output.currentState = body.current?.state || null;
          break;
        case 'visibility_changed':
          output.previousVisibility = body.previous?.accessVisibility || null;
          output.currentVisibility = body.current?.accessVisibility || null;
          break;
        case 'created':
          output.creationType = body.type || null;
          break;
        case 'processed':
          output.processingStatus = body.status || null;
          output.processingError = body.error || null;
          break;
        case 'bundle_updated':
          output.bundleStatus = body.status || null;
          output.bundleId = body.bundleId || null;
          break;
        case 'transferred_in':
          output.sourceOrganizationId =
            body.sourceOrganizationId || body.organizationId || null;
          break;
        case 'transferred_out':
          output.destinationOrganizationId =
            body.destinationOrganizationId || body.organizationId || null;
          break;
      }

      return {
        type: `model.${eventType}`,
        id: `${modelId}-${eventType}-${timestamp || Date.now()}`,
        output: output as any
      };
    }
  })
  .build();
