import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let fileEventsTrigger = SlateTrigger.create(spec, {
  name: 'File Events',
  key: 'file_events',
  description:
    'Triggered when files in a Crowdin project change state: fully translated, fully approved, added, updated, reverted, or deleted.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'The event type (e.g. file.translated, file.approved, file.added, file.updated, file.reverted, file.deleted)'
        ),
      eventId: z.string().describe('Unique event identifier'),
      projectId: z.string().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      fileId: z.string().optional().describe('File ID'),
      fileName: z.string().optional().describe('File name'),
      filePath: z.string().optional().describe('File path'),
      targetLanguageId: z
        .string()
        .optional()
        .describe('Target language (for translated/approved events)')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      fileId: z.string().optional().describe('File ID'),
      fileName: z.string().optional().describe('File name'),
      filePath: z.string().optional().describe('File path'),
      targetLanguageId: z.string().optional().describe('Target language')
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
            name: 'Slates File Events',
            url: ctx.input.webhookBaseUrl,
            events: [
              'file.translated',
              'file.approved',
              'file.added',
              'file.updated',
              'file.reverted',
              'file.deleted'
            ],
            requestType: 'POST',
            contentType: 'application/json',
            isActive: true
          });
          registrations.push({ projectId, webhookId: webhook.id });
        } catch (_e) {
          // Skip projects where webhook creation fails (e.g., permission issues)
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

      // Handle batched events
      let events = data.events ? data.events : [data];

      let inputs = events
        .filter((evt: any) => evt.event?.startsWith('file.'))
        .map((evt: any) => {
          let projectId = String(evt.project_id || evt.project?.id || '');
          let projectName = evt.project?.name || evt.project || undefined;
          let fileId = String(evt.file_id || evt.file?.id || '');
          let fileName = evt.file?.name || evt.file || undefined;
          let filePath = evt.file?.path || undefined;
          let targetLanguageId = evt.targetLanguageId || evt.language || undefined;

          return {
            eventType: evt.event,
            eventId: `${evt.event}-${projectId}-${fileId}-${targetLanguageId || ''}-${Date.now()}`,
            projectId,
            projectName: typeof projectName === 'string' ? projectName : undefined,
            fileId,
            fileName: typeof fileName === 'string' ? fileName : undefined,
            filePath,
            targetLanguageId
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
          fileId: ctx.input.fileId,
          fileName: ctx.input.fileName,
          filePath: ctx.input.filePath,
          targetLanguageId: ctx.input.targetLanguageId
        }
      };
    }
  })
  .build();
