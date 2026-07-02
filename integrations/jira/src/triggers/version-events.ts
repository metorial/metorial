import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

let webhookEvents = [
  'jira:version_created',
  'jira:version_updated',
  'jira:version_released',
  'jira:version_unreleased',
  'jira:version_moved',
  'jira:version_deleted',
  'jira:version_merged'
] as const;

export let versionEventsTrigger = SlateTrigger.create(spec, {
  name: 'Version Events',
  key: 'version_events',
  description:
    'Triggers when a project version (release) is created, updated, released, unreleased, moved, deleted, or merged.'
})
  .input(
    z.object({
      webhookEvent: z.string().describe('The webhook event name.'),
      timestamp: z.number().optional().describe('Event timestamp.'),
      versionId: z.string().describe('The version ID.'),
      versionName: z.string().describe('The version name.'),
      projectId: z.string().optional().describe('The project ID.'),
      released: z.boolean().optional().describe('Whether the version is released.'),
      archived: z.boolean().optional().describe('Whether the version is archived.'),
      releaseDate: z.string().optional().describe('The release date.'),
      description: z.string().optional().describe('The version description.')
    })
  )
  .output(
    z.object({
      versionId: z.string().describe('The version ID.'),
      versionName: z.string().describe('The version name.'),
      projectId: z.string().optional().describe('The project ID.'),
      released: z.boolean().optional().describe('Whether the version is released.'),
      archived: z.boolean().optional().describe('Whether the version is archived.'),
      releaseDate: z.string().optional().describe('The release date.'),
      description: z.string().optional().describe('The version description.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new JiraClient({
        token: ctx.auth.token,
        cloudId: ctx.auth.cloudId,
        refreshToken: ctx.auth.refreshToken
      });

      let result = await client.registerWebhook(ctx.input.webhookBaseUrl, [...webhookEvents]);

      let webhookIds = (result.webhookRegistrationResult ?? [])
        .filter((r: any) => r.createdWebhookId)
        .map((r: any) => r.createdWebhookId);

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new JiraClient({
        token: ctx.auth.token,
        cloudId: ctx.auth.cloudId,
        refreshToken: ctx.auth.refreshToken
      });

      let webhookIds = ctx.input.registrationDetails?.webhookIds ?? [];
      if (webhookIds.length > 0) {
        await client.deleteWebhook(webhookIds);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let version = data.version ?? {};

      return {
        inputs: [
          {
            webhookEvent: data.webhookEvent ?? '',
            timestamp: data.timestamp,
            versionId: String(version.id ?? ''),
            versionName: version.name ?? '',
            projectId: version.projectId != null ? String(version.projectId) : undefined,
            released: version.released,
            archived: version.archived,
            releaseDate: version.releaseDate,
            description: version.description
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventName = ctx.input.webhookEvent;
      let typeMap: Record<string, string> = {
        'jira:version_created': 'version.created',
        'jira:version_updated': 'version.updated',
        'jira:version_released': 'version.released',
        'jira:version_unreleased': 'version.unreleased',
        'jira:version_moved': 'version.moved',
        'jira:version_deleted': 'version.deleted',
        'jira:version_merged': 'version.merged'
      };
      let eventType = typeMap[eventName] ?? 'version.updated';

      return {
        type: eventType,
        id: `version-${ctx.input.versionId}-${ctx.input.timestamp ?? Date.now()}`,
        output: {
          versionId: ctx.input.versionId,
          versionName: ctx.input.versionName,
          projectId: ctx.input.projectId,
          released: ctx.input.released,
          archived: ctx.input.archived,
          releaseDate: ctx.input.releaseDate,
          description: ctx.input.description
        }
      };
    }
  })
  .build();
