import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let storageEvents = SlateTrigger.create(spec, {
  name: 'Storage Events',
  key: 'storage_events',
  description:
    'Triggers when a database crosses a storage threshold (60%, 75%, 85%, 90%, 95%). Covers both PostgreSQL cluster storage and Vitess keyspace storage events.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of storage event (cluster.storage or keyspace.storage)'),
      eventId: z.string().describe('Unique event identifier'),
      databaseName: z.string().describe('Name of the database'),
      rawPayload: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      databaseName: z.string(),
      resourceType: z.string().describe('Type of resource: cluster or keyspace'),
      resourceName: z.string().optional(),
      threshold: z.number().optional().describe('Storage threshold percentage crossed'),
      currentUsage: z.number().optional().describe('Current storage usage in bytes'),
      totalCapacity: z.number().optional().describe('Total storage capacity in bytes')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        authType: ctx.auth.authType,
        organization: ctx.config.organization
      });

      let databases = await client.listDatabases({ perPage: 100 });
      let registrations: Array<{ databaseName: string; webhookId: string }> = [];

      for (let db of databases.data) {
        try {
          let webhook = await client.createWebhook(db.name, {
            url: ctx.input.webhookBaseUrl,
            enabled: true,
            events: ['cluster.storage', 'keyspace.storage']
          });
          registrations.push({ databaseName: db.name, webhookId: webhook.id });
        } catch (_e) {
          // May fail if database already has 5 webhooks
        }
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        authType: ctx.auth.authType,
        organization: ctx.config.organization
      });

      let details = ctx.input.registrationDetails as {
        registrations: Array<{ databaseName: string; webhookId: string }>;
      };
      for (let reg of details.registrations) {
        try {
          await client.deleteWebhook(reg.databaseName, reg.webhookId);
        } catch (_e) {
          // Best effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.event || body.type || '';
      if (eventType !== 'cluster.storage' && eventType !== 'keyspace.storage') {
        return { inputs: [] };
      }

      let databaseName = body.database?.name || body.resource?.database?.name || '';
      let eventId = body.id || `${eventType}-${databaseName}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            databaseName,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { rawPayload, eventType } = ctx.input;
      let resource = rawPayload.resource || rawPayload.cluster || rawPayload.keyspace || {};
      let resourceType = eventType.startsWith('cluster') ? 'cluster' : 'keyspace';

      return {
        type: eventType,
        id: ctx.input.eventId,
        output: {
          databaseName: ctx.input.databaseName,
          resourceType,
          resourceName: resource.name,
          threshold: rawPayload.threshold || resource.threshold,
          currentUsage: rawPayload.current_usage || resource.current_usage,
          totalCapacity: rawPayload.total_capacity || resource.total_capacity
        }
      };
    }
  });
