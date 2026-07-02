import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let eventNameMap: Record<string, string> = {
  WorkbookCreated: 'workbook.created',
  WorkbookUpdated: 'workbook.updated',
  WorkbookDeleted: 'workbook.deleted',
  WorkbookRefreshStarted: 'workbook.refresh_started',
  WorkbookRefreshSucceeded: 'workbook.refresh_succeeded',
  WorkbookRefreshFailed: 'workbook.refresh_failed'
};

let webhookEventNames = [
  'WorkbookCreated',
  'WorkbookUpdated',
  'WorkbookDeleted',
  'WorkbookRefreshStarted',
  'WorkbookRefreshSucceeded',
  'WorkbookRefreshFailed'
];

export let workbookEvents = SlateTrigger.create(spec, {
  name: 'Workbook Events',
  key: 'workbook_events',
  description:
    'Triggers when a workbook is created, updated, deleted, or when an extract refresh starts, succeeds, or fails.'
})
  .input(
    z.object({
      eventType: z.string().describe('Tableau webhook event type'),
      resourceId: z.string().describe('LUID of the affected workbook'),
      resourceName: z.string().describe('Name of the affected workbook'),
      siteId: z.string().describe('LUID of the site'),
      timestamp: z.string().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      workbookId: z.string().describe('LUID of the affected workbook'),
      workbookName: z.string().describe('Name of the workbook'),
      siteId: z.string().describe('LUID of the site'),
      timestamp: z.string().describe('When the event occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.config, ctx.auth);
      let webhookIds: Record<string, string> = {};

      for (let eventName of webhookEventNames) {
        let webhook = await client.createWebhook(
          `slates-workbook-${eventName}`,
          eventName,
          ctx.input.webhookBaseUrl
        );
        webhookIds[eventName] = webhook.id;
      }

      return { registrationDetails: { webhookIds } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx.config, ctx.auth);
      let webhookIds = ctx.input.registrationDetails?.webhookIds || {};

      for (let webhookId of Object.values(webhookIds) as string[]) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (_e) {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: body.eventType || body['webhook-source-event-name'] || 'unknown',
            resourceId: body.resource_luid || body.resourceId || '',
            resourceName: body.resource_name || body.resourceName || '',
            siteId: body.site_luid || body.siteId || '',
            timestamp: body.created_at || body.timestamp || new Date().toISOString()
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let mappedType = eventNameMap[ctx.input.eventType] || `workbook.${ctx.input.eventType}`;

      return {
        type: mappedType,
        id: `${ctx.input.resourceId}-${ctx.input.timestamp}`,
        output: {
          workbookId: ctx.input.resourceId,
          workbookName: ctx.input.resourceName,
          siteId: ctx.input.siteId,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
