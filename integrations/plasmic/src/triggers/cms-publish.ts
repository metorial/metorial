import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let cmsPublish = SlateTrigger.create(spec, {
  name: 'CMS Entry Published',
  key: 'cms_entry_published',
  description:
    'Triggers when a CMS entry is published in Plasmic. Configure the webhook URL in the Plasmic CMS settings. Provides details about the published entry.'
})
  .input(
    z.object({
      entryId: z.string().optional().describe('ID of the published CMS entry'),
      modelId: z.string().optional().describe('ID of the CMS model the entry belongs to'),
      rawPayload: z.record(z.string(), z.unknown()).describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      entryId: z.string().describe('ID of the published CMS entry'),
      modelId: z.string().describe('ID of the CMS model'),
      entry: z
        .record(z.string(), z.unknown())
        .describe('Published entry data from the webhook payload')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: Record<string, unknown> = {};
      try {
        body = (await ctx.request.json()) as Record<string, unknown>;
      } catch {
        // Webhook may not always include a body
      }

      let entryId = (body.id ?? body.rowId ?? body.entryId ?? '') as string;
      let modelId = (body.modelId ?? body.tableId ?? '') as string;

      return {
        inputs: [
          {
            entryId,
            modelId,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let entryId = ctx.input.entryId ?? 'unknown';
      let modelId = ctx.input.modelId ?? 'unknown';

      return {
        type: 'cms_entry.published',
        id: `cms_publish_${entryId}_${Date.now()}`,
        output: {
          entryId,
          modelId,
          entry: ctx.input.rawPayload
        }
      };
    }
  })
  .build();
