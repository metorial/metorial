import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let projectEventsTrigger = SlateTrigger.create(spec, {
  name: 'Project Events',
  key: 'project_events',
  description:
    'Receive real-time notifications for events in a Basecamp project via webhooks. Covers to-dos, messages, comments, documents, uploads, schedule entries, campfire cards, and more.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique ID of the webhook delivery'),
      kind: z.string().describe('Event kind (e.g., todo_created, message_content_updated)'),
      recordingType: z
        .string()
        .describe('Type of the recording (e.g., Todo, Message, Comment)'),
      recordingId: z.number().describe('ID of the affected recording'),
      projectId: z.number().describe('ID of the project (bucket)'),
      creatorId: z.number().describe('ID of the person who triggered the event'),
      creatorName: z.string().describe('Name of the person who triggered the event'),
      createdAt: z.string().describe('When the event occurred'),
      details: z.any().describe('Full event payload from Basecamp')
    })
  )
  .output(
    z.object({
      recordingId: z.number().describe('ID of the affected recording'),
      recordingType: z
        .string()
        .describe('Type of the recording (e.g., Todo, Message, Comment)'),
      title: z.string().nullable().describe('Title or content of the recording'),
      projectId: z.number().describe('ID of the project'),
      projectName: z.string().nullable().describe('Name of the project'),
      creatorId: z.number().describe('ID of the person who triggered the event'),
      creatorName: z.string().describe('Name of the person who triggered the event'),
      createdAt: z.string().describe('When the event occurred'),
      url: z.string().nullable().describe('App URL of the affected recording')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountId: ctx.config.accountId
      });

      // We need a project to register a webhook on. The projectId must be provided.
      // Basecamp webhooks are per-project, so we register on each specified project.
      // The webhookBaseUrl is provided by the platform.
      // Since we don't have a project ID in config, we'll list all projects and register on each.
      // However, the simpler approach is to have the user specify a project.
      // For maximum flexibility, we'll store the webhook URL and let auto-register create webhooks on all active projects.

      let projects = await client.listProjects();
      let registrations: Array<{ projectId: number; webhookId: number }> = [];

      for (let project of projects) {
        try {
          let webhook = await client.createWebhook(String(project.id), {
            payloadUrl: ctx.input.webhookBaseUrl
          });
          registrations.push({
            projectId: project.id,
            webhookId: webhook.id
          });
        } catch (_e) {
          // Skip projects where webhook creation fails (e.g., permissions)
        }
      }

      return {
        registrationDetails: {
          registrations
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountId: ctx.config.accountId
      });

      let registrations = (ctx.input.registrationDetails as any)?.registrations || [];

      for (let reg of registrations) {
        try {
          await client.deleteWebhook(String(reg.projectId), String(reg.webhookId));
        } catch (_e) {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;

      // Basecamp webhook payload has: id, kind, details, recording (with id, type, bucket), creator
      let recording = data.recording || {};
      let creator = data.creator || {};
      let bucket = recording.bucket || {};

      return {
        inputs: [
          {
            eventId: String(data.id ?? `${data.kind}_${recording.id}_${data.created_at}`),
            kind: data.kind || 'unknown',
            recordingType: recording.type || 'Unknown',
            recordingId: recording.id || 0,
            projectId: bucket.id || 0,
            creatorId: creator.id || 0,
            creatorName: creator.name || 'Unknown',
            createdAt: data.created_at || new Date().toISOString(),
            details: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { kind, details } = ctx.input;
      let recording = details?.recording || {};

      // Derive the event type from kind, e.g. "todo_created" -> "todo.created"
      let eventType = kind.replace(/_([a-z])/, '.$1');
      // Better: split on first underscore to get resource.action pattern
      let underscoreIdx = kind.indexOf('_');
      if (underscoreIdx > 0) {
        eventType = `${kind.substring(0, underscoreIdx)}.${kind.substring(underscoreIdx + 1)}`;
      }

      return {
        type: eventType,
        id: ctx.input.eventId,
        output: {
          recordingId: ctx.input.recordingId,
          recordingType: ctx.input.recordingType,
          title: recording.title || recording.subject || recording.content || null,
          projectId: ctx.input.projectId,
          projectName: recording.bucket?.name ?? null,
          creatorId: ctx.input.creatorId,
          creatorName: ctx.input.creatorName,
          createdAt: ctx.input.createdAt,
          url: recording.app_url ?? null
        }
      };
    }
  })
  .build();
