import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let suggestionEventsTrigger = SlateTrigger.create(spec, {
  name: 'Translation Suggestion Events',
  key: 'suggestion_events',
  description:
    'Triggered when translation suggestions are added, updated, deleted, approved, or disapproved in a Crowdin project.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'The event type (suggestion.added, suggestion.updated, suggestion.deleted, suggestion.approved, suggestion.disapproved)'
        ),
      eventId: z.string().describe('Unique event identifier'),
      projectId: z.string().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      languageId: z.string().optional().describe('Language code'),
      sourceStringId: z.string().optional().describe('Source string ID'),
      translationId: z.string().optional().describe('Translation suggestion ID'),
      userId: z.string().optional().describe('User ID who triggered the event'),
      username: z.string().optional().describe('Username'),
      fileId: z.string().optional().describe('File ID')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      languageId: z.string().optional().describe('Language code'),
      sourceStringId: z.string().optional().describe('Source string ID'),
      translationId: z.string().optional().describe('Translation suggestion ID'),
      userId: z.string().optional().describe('User ID'),
      username: z.string().optional().describe('Username'),
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
            name: 'Slates Suggestion Events',
            url: ctx.input.webhookBaseUrl,
            events: [
              'suggestion.added',
              'suggestion.updated',
              'suggestion.deleted',
              'suggestion.approved',
              'suggestion.disapproved'
            ],
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
        .filter((evt: any) => evt.event?.startsWith('suggestion.'))
        .map((evt: any) => {
          let projectId = String(evt.project_id || evt.project?.id || '');
          let projectName = evt.project?.name || evt.project || undefined;
          let translationId = String(evt.translation_id || '');

          return {
            eventType: evt.event,
            eventId: `${evt.event}-${projectId}-${translationId}-${Date.now()}`,
            projectId,
            projectName: typeof projectName === 'string' ? projectName : undefined,
            languageId: evt.language || evt.targetLanguageId || undefined,
            sourceStringId: evt.source_string_id ? String(evt.source_string_id) : undefined,
            translationId,
            userId: evt.user_id ? String(evt.user_id) : undefined,
            username: evt.user || undefined,
            fileId: evt.file_id ? String(evt.file_id) : undefined
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
          languageId: ctx.input.languageId,
          sourceStringId: ctx.input.sourceStringId,
          translationId: ctx.input.translationId,
          userId: ctx.input.userId,
          username: ctx.input.username,
          fileId: ctx.input.fileId
        }
      };
    }
  })
  .build();
