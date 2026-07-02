import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let syncContent = SlateTool.create(spec, {
  name: 'Sync Content',
  key: 'sync_content',
  description: `Perform a content sync via the Content Delivery API. Use initial sync to fetch all content, or provide a sync token to retrieve incremental changes (deltas) since the last sync.`,
  instructions: [
    'For the first sync, set initial to true. Save the returned nextSyncToken.',
    'For subsequent syncs, provide the syncToken from the previous sync result.',
    'You may filter initial syncs by type: "Entry", "Asset", or "Deletion".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      initial: z.boolean().optional().describe('Set to true for an initial full sync.'),
      syncToken: z
        .string()
        .optional()
        .describe('Sync token from a previous sync to get incremental changes.'),
      type: z
        .string()
        .optional()
        .describe('Filter initial sync by type: "Entry", "Asset", or "Deletion".')
    })
  )
  .output(
    z.object({
      items: z.array(z.any()).describe('Synced items (entries, assets, or deletions).'),
      nextSyncUrl: z.string().optional().describe('URL for the next sync page, if paginated.'),
      nextSyncToken: z
        .string()
        .optional()
        .describe('Token to use for the next incremental sync.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let result = await client.sync({
      initial: ctx.input.initial,
      syncToken: ctx.input.syncToken,
      type: ctx.input.type
    });

    // Extract sync token from nextSyncUrl or nextPageUrl
    let nextSyncToken: string | undefined;
    if (result.nextSyncUrl) {
      let url = new URL(result.nextSyncUrl);
      nextSyncToken = url.searchParams.get('sync_token') || undefined;
    }

    return {
      output: {
        items: result.items || [],
        nextSyncUrl: result.nextPageUrl || result.nextSyncUrl,
        nextSyncToken
      },
      message: `Synced **${(result.items || []).length}** items.${nextSyncToken ? ` Next sync token: \`${nextSyncToken.substring(0, 20)}...\`` : ''}`
    };
  })
  .build();
