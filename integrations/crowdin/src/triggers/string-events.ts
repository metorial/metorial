import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let stringEventsTrigger = SlateTrigger.create(spec, {
  name: 'Source String Events',
  key: 'string_events',
  description:
    'Triggered when source strings are added, updated, or deleted in a Crowdin project.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The event type (string.added, string.updated, string.deleted)'),
      eventId: z.string().describe('Unique event identifier'),
      projectId: z.string().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      stringId: z.string().optional().describe('Source string ID'),
      stringText: z.string().optional().describe('Source string text'),
      stringIdentifier: z.string().optional().describe('Source string key/identifier'),
      fileId: z.string().optional().describe('File ID')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      stringId: z.string().optional().describe('Source string ID'),
      stringText: z.string().optional().describe('Source string text'),
      stringIdentifier: z.string().optional().describe('Source string key/identifier'),
      fileId: z.string().optional().describe('File ID')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let projects = await client.listProjects({ limit: 500 });
      let registrations: Array<{ projectId: number; webhookId: number }> = [];

      for (let item of projects.data) {
        let projectId = item.data.id;
        try {
          let webhook = await client.createWebhook(projectId, {
            name: 'Slates String Events',
            url: ctx.input.webhookBaseUrl,
            events: ['string.added', 'string.updated', 'string.deleted'],
            requestType: 'POST',
            contentType: 'application/json',
            isActive: true
          });
          registrations.push({ projectId, webhookId: webhook.id });
        } catch (_e) {
          // Skip projects where webhook creation fails
        }
      }

      return { registrationDetails: { registrations } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let registrations = ctx.input.registrationDetails?.registrations || [];

      for (let reg of registrations) {
        try {
          await client.deleteWebhook(reg.projectId, reg.webhookId);
        } catch (_e) {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let events = data.events ? data.events : [data];

      let inputs = events
        .filter((evt: any) => evt.event?.startsWith('string.'))
        .map((evt: any) => {
          let projectId = String(evt.project_id || evt.project?.id || '');
          let projectName = evt.project?.name || evt.project || undefined;
          let stringId = String(evt.string?.id || evt.source_string_id || '');

          return {
            eventType: evt.event,
            eventId: `${evt.event}-${projectId}-${stringId}-${Date.now()}`,
            projectId,
            projectName: typeof projectName === 'string' ? projectName : undefined,
            stringId,
            stringText: evt.string?.text || undefined,
            stringIdentifier: evt.string?.identifier || undefined,
            fileId: evt.file_id
              ? String(evt.file_id)
              : evt.string?.fileId
                ? String(evt.string.fileId)
                : undefined
          };
        });

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          projectId: ctx.input.projectId,
          projectName: ctx.input.projectName,
          stringId: ctx.input.stringId,
          stringText: ctx.input.stringText,
          stringIdentifier: ctx.input.stringIdentifier,
          fileId: ctx.input.fileId
        }
      };
    }
  })
  .build();
