import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deployRequestEvents = SlateTrigger.create(spec, {
  name: 'Deploy Request Events',
  key: 'deploy_request_events',
  description:
    'Triggers when deploy request lifecycle events occur (Vitess only): opened, queued, in progress, pending cutover, schema applied, errored, reverted, or closed.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of deploy request event'),
      eventId: z.string().describe('Unique event identifier'),
      databaseName: z.string().describe('Name of the database'),
      deployRequestNumber: z.number().describe('Deploy request number'),
      rawPayload: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      databaseName: z.string(),
      deployRequestNumber: z.number(),
      deployRequestId: z.string().optional(),
      branch: z.string().optional(),
      intoBranch: z.string().optional(),
      state: z.string().optional(),
      deploymentState: z.string().optional(),
      approved: z.boolean().optional(),
      createdAt: z.string().optional(),
      htmlUrl: z.string().optional()
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
        if (db.kind === 'postgresql') continue;
        try {
          let webhook = await client.createWebhook(db.name, {
            url: ctx.input.webhookBaseUrl,
            enabled: true,
            events: [
              'deploy_request.opened',
              'deploy_request.queued',
              'deploy_request.in_progress',
              'deploy_request.pending_cutover',
              'deploy_request.schema_applied',
              'deploy_request.errored',
              'deploy_request.reverted',
              'deploy_request.closed'
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
      let deployRequestEvents = [
        'deploy_request.opened',
        'deploy_request.queued',
        'deploy_request.in_progress',
        'deploy_request.pending_cutover',
        'deploy_request.schema_applied',
        'deploy_request.errored',
        'deploy_request.reverted',
        'deploy_request.closed'
      ];
      if (!deployRequestEvents.includes(eventType)) {
        return { inputs: [] };
      }

      let databaseName = body.database?.name || body.resource?.database?.name || '';
      let dr = body.deploy_request || body.resource?.deploy_request || body.resource || {};
      let deployRequestNumber = dr.number || 0;
      let eventId =
        body.id || `${eventType}-${databaseName}-${deployRequestNumber}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            databaseName,
            deployRequestNumber,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { rawPayload } = ctx.input;
      let dr =
        rawPayload.deploy_request ||
        rawPayload.resource?.deploy_request ||
        rawPayload.resource ||
        {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          databaseName: ctx.input.databaseName,
          deployRequestNumber: ctx.input.deployRequestNumber,
          deployRequestId: dr.id,
          branch: dr.branch,
          intoBranch: dr.into_branch,
          state: dr.state,
          deploymentState: dr.deployment_state,
          approved: dr.approved,
          createdAt: dr.created_at,
          htmlUrl: dr.html_url
        }
      };
    }
  });
