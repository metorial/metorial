import { createApiServiceError, SlateTrigger } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let deploymentEvents = SlateTrigger.create(spec, {
  name: 'Deployment Events',
  key: 'deployment_events',
  description:
    'Triggers on deployment lifecycle events including builds, deploys, pre-deploy commands, and one-off job completions.'
})
  .input(
    z.object({
      eventType: z.string().describe('Webhook event type'),
      eventId: z.string().describe('Event ID'),
      timestamp: z.string().describe('Event timestamp'),
      payload: z.any().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      serviceId: z.string().optional().describe('Service ID'),
      serviceName: z.string().optional().describe('Service name'),
      status: z
        .string()
        .optional()
        .describe('Event status (e.g., success, failure, canceled)'),
      commitId: z.string().optional().describe('Commit ID if applicable'),
      imageUrl: z.string().optional().describe('Image URL if applicable')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new RenderClient(ctx.auth.token);

      // First get the workspaces to find an ownerId
      let workspaces = await client.listWorkspaces({ limit: 1 });
      let ownerId = (workspaces as any[])?.[0]?.owner?.id;
      if (!ownerId) throw createApiServiceError('No workspace found to register webhook');

      let webhook = await client.createWebhook({
        ownerId,
        url: ctx.input.webhookBaseUrl,
        name: 'Slates Deployment Events',
        enabled: true,
        eventFilter: [
          'build_started',
          'build_ended',
          'deploy_started',
          'deploy_ended',
          'pre_deploy_started',
          'pre_deploy_ended',
          'image_pull_failed',
          'job_run_ended',
          'commit_ignored',
          'branch_deleted'
        ]
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new RenderClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.type,
            eventId: data.data?.id || `${data.type}-${data.timestamp}`,
            timestamp: data.timestamp,
            payload: data.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.payload || {};

      return {
        type: `deployment.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          serviceId: payload.serviceId,
          serviceName: payload.serviceName,
          status: payload.status,
          commitId: payload.commitId,
          imageUrl: payload.imageUrl
        }
      };
    }
  })
  .build();
