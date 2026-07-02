import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let webhookEvents = [
  'deployment.created',
  'deployment.ready',
  'deployment.succeeded',
  'deployment.promoted',
  'deployment.error',
  'deployment.canceled',
  'deployment.cleanup',
  'deployment.check-rerequested'
] as const;

export let deploymentEventsTrigger = SlateTrigger.create(spec, {
  name: 'Deployment Events',
  key: 'deployment_events',
  description:
    'Fires when deployment lifecycle events occur: created, ready, succeeded, promoted, error, canceled, or cleanup.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of deployment event'),
      webhookId: z.string().describe('Webhook delivery ID'),
      payload: z.any().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      deploymentId: z.string().describe('Deployment unique ID'),
      projectId: z.string().optional().describe('Associated project ID'),
      projectName: z.string().optional().describe('Associated project name'),
      url: z.string().optional().nullable().describe('Deployment URL'),
      state: z.string().optional().describe('Deployment state'),
      target: z
        .string()
        .optional()
        .nullable()
        .describe('Target environment (production, preview)'),
      createdAt: z.number().optional().describe('Deployment creation timestamp'),
      creator: z
        .object({
          userId: z.string().optional(),
          username: z.string().optional(),
          email: z.string().optional()
        })
        .optional()
        .describe('Deployment creator'),
      gitMetadata: z
        .object({
          commitRef: z.string().optional(),
          commitSha: z.string().optional(),
          commitMessage: z.string().optional()
        })
        .optional()
        .nullable()
        .describe('Git commit metadata'),
      errorMessage: z
        .string()
        .optional()
        .nullable()
        .describe('Error message if deployment failed')
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

      if (!data.type?.startsWith('deployment.')) {
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
      let deployment = p.deployment || p;

      return {
        type: ctx.input.eventType,
        id: ctx.input.webhookId,
        output: {
          deploymentId: deployment.id || deployment.uid || '',
          projectId: deployment.projectId || p.projectId,
          projectName: deployment.name || p.name,
          url: deployment.url || null,
          state: deployment.readyState || deployment.state,
          target: deployment.target || null,
          createdAt: deployment.createdAt,
          creator: deployment.creator
            ? {
                userId: deployment.creator.uid,
                username: deployment.creator.username,
                email: deployment.creator.email
              }
            : undefined,
          gitMetadata: deployment.meta
            ? {
                commitRef: deployment.meta.githubCommitRef || deployment.meta.gitlabCommitRef,
                commitSha: deployment.meta.githubCommitSha || deployment.meta.gitlabCommitSha,
                commitMessage:
                  deployment.meta.githubCommitMessage || deployment.meta.gitlabCommitMessage
              }
            : null,
          errorMessage: deployment.errorMessage || null
        }
      };
    }
  })
  .build();
