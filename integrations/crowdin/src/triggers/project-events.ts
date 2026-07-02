import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let projectEventsTrigger = SlateTrigger.create(spec, {
  name: 'Project Events',
  key: 'project_events',
  description:
    'Triggered on project-level events: fully translated, fully approved, successfully built, or exported translation updated.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'The event type (e.g. project.translated, project.approved, project.built, translation.updated)'
        ),
      eventId: z.string().describe('Unique event identifier'),
      projectId: z.string().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      targetLanguageId: z.string().optional().describe('Target language'),
      sourceStringId: z
        .string()
        .optional()
        .describe('Source string ID (for translation.updated)'),
      oldTranslationId: z
        .string()
        .optional()
        .describe('Previous translation ID (for translation.updated)'),
      newTranslationId: z
        .string()
        .optional()
        .describe('New translation ID (for translation.updated)')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      targetLanguageId: z.string().optional().describe('Target language'),
      sourceStringId: z.string().optional().describe('Source string ID'),
      oldTranslationId: z.string().optional().describe('Previous translation ID'),
      newTranslationId: z.string().optional().describe('New translation ID')
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
            name: 'Slates Project Events',
            url: ctx.input.webhookBaseUrl,
            events: [
              'project.translated',
              'project.approved',
              'project.built',
              'translation.updated'
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
        .filter(
          (evt: any) =>
            evt.event &&
            (evt.event.startsWith('project.') || evt.event === 'translation.updated')
        )
        .map((evt: any) => {
          let projectId = String(evt.project_id || evt.project?.id || '');
          let projectName = evt.project?.name || evt.project || undefined;

          return {
            eventType: evt.event,
            eventId: `${evt.event}-${projectId}-${evt.language || ''}-${Date.now()}`,
            projectId,
            projectName: typeof projectName === 'string' ? projectName : undefined,
            targetLanguageId: evt.targetLanguageId || evt.language || undefined,
            sourceStringId: evt.source_string_id ? String(evt.source_string_id) : undefined,
            oldTranslationId: evt.old_translation_id
              ? String(evt.old_translation_id)
              : undefined,
            newTranslationId: evt.new_translation_id
              ? String(evt.new_translation_id)
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
          targetLanguageId: ctx.input.targetLanguageId,
          sourceStringId: ctx.input.sourceStringId,
          oldTranslationId: ctx.input.oldTranslationId,
          newTranslationId: ctx.input.newTranslationId
        }
      };
    }
  })
  .build();
