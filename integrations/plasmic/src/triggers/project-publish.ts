import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let projectPublish = SlateTrigger.create(spec, {
  name: 'Project Published',
  key: 'project_published',
  description:
    'Triggers when a Plasmic project is published. Receives information about changed pages and changed imported projects/libraries. Configure the webhook URL in the Plasmic Studio publish dialog.'
})
  .input(
    z.object({
      pagesChanged: z
        .array(z.string())
        .optional()
        .describe('List of page paths or names that changed'),
      importedProjectsChanged: z
        .array(z.string())
        .optional()
        .describe('List of imported project/library IDs that changed'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      pagesChanged: z
        .array(z.string())
        .describe('List of pages that were changed in this publish'),
      importedProjectsChanged: z
        .array(z.string())
        .describe('List of imported projects/libraries that changed')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: Record<string, unknown> = {};
      try {
        body = (await ctx.request.json()) as Record<string, unknown>;
      } catch {
        // Some webhooks may be sent without a body (just a ping)
      }

      let pagesChanged = Array.isArray(body.pagesChanged)
        ? (body.pagesChanged as string[])
        : [];
      let importedProjectsChanged = Array.isArray(body.importedProjectsChanged)
        ? (body.importedProjectsChanged as string[])
        : [];

      let _eventId = `project_publish_${Date.now()}`;

      return {
        inputs: [
          {
            pagesChanged,
            importedProjectsChanged,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let pagesChanged = ctx.input.pagesChanged ?? [];
      let importedProjectsChanged = ctx.input.importedProjectsChanged ?? [];

      return {
        type: 'project.published',
        id: `project_publish_${Date.now()}_${pagesChanged.join(',')}`,
        output: {
          pagesChanged,
          importedProjectsChanged
        }
      };
    }
  })
  .build();
