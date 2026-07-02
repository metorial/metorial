import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let eventNameMap: Record<string, string> = {
  'webhook-source-event-datasourcecreated': 'datasource.created',
  'webhook-source-event-datasourceupdated': 'datasource.updated',
  'webhook-source-event-datasourcedeleted': 'datasource.deleted',
  'webhook-source-event-datasourcerefreshstarted': 'datasource.refresh_started',
  'webhook-source-event-datasourcerefreshsucceeded': 'datasource.refresh_succeeded',
  'webhook-source-event-datasourcerefreshfailed': 'datasource.refresh_failed',
  DatasourceCreated: 'datasource.created',
  DatasourceUpdated: 'datasource.updated',
  DatasourceDeleted: 'datasource.deleted',
  DatasourceRefreshStarted: 'datasource.refresh_started',
  DatasourceRefreshSucceeded: 'datasource.refresh_succeeded',
  DatasourceRefreshFailed: 'datasource.refresh_failed'
};

let webhookEventNames = [
  'DatasourceCreated',
  'DatasourceUpdated',
  'DatasourceDeleted',
  'DatasourceRefreshStarted',
  'DatasourceRefreshSucceeded',
  'DatasourceRefreshFailed'
];

export let datasourceEvents = SlateTrigger.create(spec, {
  name: 'Data Source Events',
  key: 'datasource_events',
  description:
    'Triggers when a data source is created, updated, deleted, or when an extract refresh starts, succeeds, or fails.'
})
  .input(
    z.object({
      eventType: z.string().describe('Tableau webhook event type'),
      resourceId: z.string().describe('LUID of the affected data source'),
      resourceName: z.string().describe('Name of the affected data source'),
      siteId: z.string().describe('LUID of the site'),
      timestamp: z.string().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      datasourceId: z.string().describe('LUID of the affected data source'),
      datasourceName: z.string().describe('Name of the data source'),
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
          `slates-datasource-${eventName}`,
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

      let eventType = body.resource_type
        ? `${body.resource_type}${body.event_type ? `_${body.event_type}` : ''}`
        : body.eventType || body['webhook-source-event-name'] || 'unknown';

      return {
        inputs: [
          {
            eventType: eventType,
            resourceId: body.resource_luid || body.resourceId || '',
            resourceName: body.resource_name || body.resourceName || '',
            siteId: body.site_luid || body.siteId || '',
            timestamp: body.created_at || body.timestamp || new Date().toISOString()
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let mappedType =
        eventNameMap[ctx.input.eventType] || `datasource.${ctx.input.eventType}`;

      return {
        type: mappedType,
        id: `${ctx.input.resourceId}-${ctx.input.timestamp}`,
        output: {
          datasourceId: ctx.input.resourceId,
          datasourceName: ctx.input.resourceName,
          siteId: ctx.input.siteId,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
