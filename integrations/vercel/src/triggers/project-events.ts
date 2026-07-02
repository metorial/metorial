import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let webhookEvents = [
  'project.created',
  'project.removed',
  'project.renamed',
  'project.domain-created',
  'project.domain-deleted',
  'project.domain-moved',
  'project.domain-updated',
  'project.domain-verified',
  'project.domain-unverified',
  'project.env-variable.created',
  'project.env-variable.updated',
  'project.env-variable.deleted'
] as const;

export let projectEventsTrigger = SlateTrigger.create(spec, {
  name: 'Project Events',
  key: 'project_events',
  description:
    'Fires when project lifecycle events occur: created, removed, renamed, domain changes, and environment variable changes.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of project event'),
      webhookId: z.string().describe('Webhook delivery ID'),
      payload: z.any().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      domain: z.string().optional().nullable().describe('Domain name (for domain events)'),
      envVarKey: z
        .string()
        .optional()
        .nullable()
        .describe('Environment variable key (for env var events)'),
      envVarTarget: z
        .array(z.string())
        .optional()
        .nullable()
        .describe('Environment variable targets (for env var events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        teamId: ctx.config.teamId
      });

      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: [...webhookEvents]
      });

      return {
        registrationDetails: {
          webhookId: result.id,
          secret: result.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        teamId: ctx.config.teamId
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (!data.type?.startsWith('project.')) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: data.type,
            webhookId: data.id,
            payload: data.payload || data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload;
      let project = p.project || p;
      let domain = p.domain || null;
      let envVar = p.envVariable || p.environmentVariable || null;

      return {
        type: ctx.input.eventType,
        id: ctx.input.webhookId,
        output: {
          projectId: project.id || '',
          projectName: project.name,
          domain: typeof domain === 'string' ? domain : domain?.name || null,
          envVarKey: envVar?.key || null,
          envVarTarget: envVar?.target || null
        }
      };
    }
  })
  .build();
