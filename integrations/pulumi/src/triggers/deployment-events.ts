import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deploymentEvents = SlateTrigger.create(spec, {
  name: 'Deployment Events',
  key: 'deployment_events',
  description:
    'Triggered when Pulumi Deployment lifecycle events occur, including queued, started, succeeded, and failed states.'
})
  .input(
    z.object({
      webhookId: z.string().describe('Pulumi webhook delivery ID'),
      kind: z.string().describe('Event kind'),
      payload: z.any().describe('Webhook event payload')
    })
  )
  .output(
    z.object({
      organizationName: z.string().optional(),
      projectName: z.string().optional(),
      stackName: z.string().optional(),
      deploymentUrl: z.string().optional(),
      deploymentVersion: z.number().optional(),
      operation: z.string().optional(),
      status: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let org = ctx.config.organization;
      if (!org)
        throw new Error('Organization must be set in config for webhook auto-registration.');

      let result = await client.createOrgWebhook(org, {
        active: true,
        displayName: `Slates Deployment Events Webhook`,
        payloadUrl: ctx.input.webhookBaseUrl,
        format: 'raw',
        filters: [
          'deployment_queued',
          'deployment_started',
          'deployment_succeeded',
          'deployment_failed'
        ]
      });

      return {
        registrationDetails: {
          webhookName: result.name,
          organizationName: org
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let details = ctx.input.registrationDetails as {
        webhookName: string;
        organizationName: string;
      };
      await client.deleteOrgWebhook(details.organizationName, details.webhookName);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let webhookId = ctx.request.headers.get('Pulumi-Webhook-ID') || '';
      let kind = ctx.request.headers.get('Pulumi-Webhook-Kind') || body.kind || '';

      let deploymentEventKinds = [
        'deployment_queued',
        'deployment_started',
        'deployment_succeeded',
        'deployment_failed'
      ];

      if (!deploymentEventKinds.includes(kind)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            webhookId,
            kind,
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.payload;

      return {
        type: `deployment.${ctx.input.kind}`,
        id: ctx.input.webhookId,
        output: {
          organizationName: payload.organization?.name,
          projectName: payload.projectName,
          stackName: payload.stackName,
          deploymentUrl: payload.deploymentUrl,
          deploymentVersion: payload.version,
          operation: payload.operation,
          status: payload.status
        }
      };
    }
  })
  .build();
