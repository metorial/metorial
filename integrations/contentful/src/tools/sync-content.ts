import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { selection } from '../lib/schemas';
import { spec } from '../spec';

export let syncContent = SlateTool.create(spec, {
  name: 'Sync Content',
  key: 'sync_content',
  description: `Perform a content sync via the Content Delivery API. Fetch one page of an initial sync, or provide a sync token to retrieve incremental changes (deltas) since the last sync.`,
  instructions: [
    'For the first sync, set initial to true. Continue with nextPageToken as syncToken until hasMore is false, then save nextSyncToken.',
    'For subsequent syncs, provide the syncToken from the previous sync result.',
    'You may filter initial syncs by type: "Entry", "Asset", or "Deletion".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...selection,
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Initial sync page size, at most 100.'),
      api: z
        .enum(['management', 'delivery', 'preview'])
        .optional()
        .describe(
          'API for legacy token-only connections. Must match the credential type; reconnect if unknown.'
        ),
      initial: z
        .boolean()
        .optional()
        .describe(
          'Set to true to start an initial sync; follow nextPageToken until complete.'
        ),
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
      nextPageToken: z.string().optional(),
      hasMore: z.boolean(),
      items: z.array(z.any()).describe('Synced items (entries, assets, or deletions).'),
      nextSyncUrl: z.string().optional().describe('URL for the next sync page, if paginated.'),
      nextSyncToken: z
        .string()
        .optional()
        .describe('Token to use for the next incremental sync.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth, ctx.input);

    let result = await client.sync({
      initial: ctx.input.initial,
      syncToken: ctx.input.syncToken,
      type: ctx.input.type,
      limit: ctx.input.limit
    });

    return {
      output: {
        items: result.items,
        nextSyncUrl: result.nextPageUrl || result.nextSyncUrl,
        nextSyncToken: result.nextSyncToken,
        nextPageToken: result.nextPageToken,
        hasMore: result.hasMore
      },
      message: `Retrieved one sync page with ${result.items.length} items. ${result.hasMore ? 'Continue the current sync with nextPageToken.' : 'This sync is complete; save nextSyncToken.'}`
    };
  })
  .build();
