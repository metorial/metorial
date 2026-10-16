import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { linkFields } from '../lib/schemas';
import { spec } from '../spec';

export let bulkUpsertLinks = SlateTool.create(spec, {
  name: 'Bulk Create or Update Links',
  key: 'bulk_upsert_links',
  description:
    'Creates or updates up to 1000 links in one request. Supply linkId on an item to update that link, or omit it to create a new link.',
  instructions: [
    'Every item requires its destination URL, including updates.',
    'Inspect the provider result for individual link IDs and any item-level errors.',
    'Use smaller batches if a large request takes too long.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      links: z
        .array(
          z.object({
            linkId: z
              .number()
              .optional()
              .describe('Existing link ID for an update; omit to create a new link'),
            ...linkFields
          })
        )
        .min(1)
        .max(1000)
        .describe('Links to create or update in the connected workspace')
    })
  )
  .output(
    z.object({
      submittedCount: z.number().describe('Number of links submitted'),
      result: z
        .any()
        .describe(
          'Complete provider response, including created or updated link records and any item-level errors'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.bulkUpsertLinks(ctx.input.links);
    return {
      output: { submittedCount: ctx.input.links.length, result },
      message: `Submitted **${ctx.input.links.length}** link(s). Inspect the result for individual outcomes.`
    };
  })
  .build();
