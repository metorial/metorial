import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { spec } from '../spec';

export let resourceChangeTrigger = SlateTrigger.create(spec, {
  name: 'Resource Changes',
  key: 'resource_changes',
  description:
    'Triggered when changes occur to LaunchDarkly resources (flags, projects, environments, segments, members, etc.). Uses webhooks with automatic registration to receive real-time change notifications.'
})
  .input(
    z.object({
      action: z
        .string()
        .describe('The action performed (e.g., "updateOn", "createFlag", "deleteFlag")'),
      kind: z
        .string()
        .describe('Resource kind (e.g., "flag", "project", "environment", "segment")'),
      resourceName: z.string().describe('Name of the affected resource'),
      resourceKey: z.string().optional().describe('Key of the affected resource'),
      projectKey: z.string().optional().describe('Project key if applicable'),
      environmentKey: z.string().optional().describe('Environment key if applicable'),
      description: z.string().describe('Human-readable description of the change'),
      memberEmail: z.string().optional().describe('Email of the member who made the change'),
      memberName: z.string().optional().describe('Name of the member who made the change'),
      date: z.string().describe('Timestamp of the change (ms since epoch)'),
      auditLogEntryId: z.string().describe('Audit log entry ID for deduplication')
    })
  )
  .output(
    z.object({
      action: z.string().describe('The action performed'),
      kind: z.string().describe('Resource kind'),
      resourceName: z.string().describe('Name of the affected resource'),
      resourceKey: z.string().optional().describe('Key of the affected resource'),
      projectKey: z.string().optional().describe('Project key'),
      environmentKey: z.string().optional().describe('Environment key'),
      description: z.string().describe('Human-readable description of the change'),
      memberEmail: z.string().optional().describe('Email of the member who made the change'),
      memberName: z.string().optional().describe('Name of the member'),
      date: z.string().describe('Timestamp of the change')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new LaunchDarklyClient(ctx.auth.token);

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        name: 'Slates Integration Webhook',
        sign: true,
        on: true,
        statements: [
          {
            effect: 'allow',
            actions: ['*'],
            resources: [
              'proj/*:env/*:flag/*',
              'proj/*',
              'proj/*:env/*',
              'proj/*:env/*:segment/*',
              'member/*'
            ]
          }
        ]
      });

      return {
        registrationDetails: {
          webhookId: webhook._id,
          secret: webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new LaunchDarklyClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data?._id) {
        return { inputs: [] };
      }

      let kind = data.kind ?? 'unknown';
      let action = data.titleVerb ?? data.name ?? 'changed';

      let projectKey: string | undefined;
      let environmentKey: string | undefined;
      let resourceKey: string | undefined;

      if (data.target?.resources) {
        for (let resource of data.target.resources) {
          if (resource.type === 'proj') projectKey = resource.key;
          if (resource.type === 'env') environmentKey = resource.key;
          if (resource.type === 'flag' || resource.type === 'segment')
            resourceKey = resource.key;
        }
      }

      return {
        inputs: [
          {
            action,
            kind,
            resourceName: data.name ?? '',
            resourceKey,
            projectKey,
            environmentKey,
            description: data.description ?? data.shortDescription ?? '',
            memberEmail: data.member?.email,
            memberName: data.member?.firstName
              ? `${data.member.firstName} ${data.member.lastName ?? ''}`.trim()
              : undefined,
            date: String(data.date),
            auditLogEntryId: data._id
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventKind = ctx.input.kind.toLowerCase().replace(/\s+/g, '_');
      let eventAction = ctx.input.action.toLowerCase().replace(/\s+/g, '_');

      return {
        type: `${eventKind}.${eventAction}`,
        id: ctx.input.auditLogEntryId,
        output: {
          action: ctx.input.action,
          kind: ctx.input.kind,
          resourceName: ctx.input.resourceName,
          resourceKey: ctx.input.resourceKey,
          projectKey: ctx.input.projectKey,
          environmentKey: ctx.input.environmentKey,
          description: ctx.input.description,
          memberEmail: ctx.input.memberEmail,
          memberName: ctx.input.memberName,
          date: ctx.input.date
        }
      };
    }
  })
  .build();
