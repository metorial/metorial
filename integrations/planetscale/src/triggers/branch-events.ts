import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let branchEvents = SlateTrigger.create(spec, {
  name: 'Branch Events',
  key: 'branch_events',
  description:
    'Triggers when branch events occur: branch ready, sleeping, anomaly detected, primary promoted, out of memory, or maintenance starting.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of branch event'),
      eventId: z.string().describe('Unique event identifier'),
      databaseName: z.string().describe('Name of the database'),
      branchName: z.string().describe('Name of the branch'),
      rawPayload: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      databaseName: z.string(),
      branchName: z.string(),
      branchId: z.string().optional(),
      state: z.string().optional(),
      kind: z.string().optional(),
      production: z.boolean().optional(),
      region: z.string().optional(),
      anomaly: z.any().optional().describe('Anomaly details if event is branch.anomaly'),
      storageThreshold: z
        .number()
        .optional()
        .describe('Storage threshold percentage if applicable')
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
            events: [
              'branch.ready',
              'branch.sleeping',
              'branch.anomaly',
              'branch.primary_promoted',
              'branch.out_of_memory',
              'branch.start_maintenance'
            ]
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
      let branchEvents = [
        'branch.ready',
        'branch.sleeping',
        'branch.anomaly',
        'branch.primary_promoted',
        'branch.out_of_memory',
        'branch.start_maintenance'
      ];
      if (!branchEvents.includes(eventType)) {
        return { inputs: [] };
      }

      let databaseName = body.database?.name || body.resource?.database?.name || '';
      let branchName =
        body.branch?.name || body.resource?.branch?.name || body.resource?.name || '';
      let eventId = body.id || `${eventType}-${databaseName}-${branchName}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            databaseName,
            branchName,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { rawPayload } = ctx.input;
      let branch =
        rawPayload.branch || rawPayload.resource?.branch || rawPayload.resource || {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          databaseName: ctx.input.databaseName,
          branchName: ctx.input.branchName,
          branchId: branch.id,
          state: branch.state,
          kind: branch.kind,
          production: branch.production,
          region: branch.region?.display_name || branch.region?.slug,
          anomaly: rawPayload.anomaly || rawPayload.query_anomaly
        }
      };
    }
  });
