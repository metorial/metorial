import { SlateTool } from 'slates';
import { z } from 'zod';
import { FetchClient } from '../lib/client';
import { spec } from '../spec';

export let syncContent = SlateTool.create(spec, {
  name: 'Sync Content',
  key: 'sync_content',
  description: `Performs incremental content synchronization using the Content Sync API. Pass syncToken "0" for an initial full sync. The returned syncToken should be stored and used for subsequent calls to fetch only changed content. Supports syncing both content items and pages.`,
  instructions: [
    'Use syncToken "0" for the initial full sync.',
    'Store the returned syncToken for subsequent delta syncs.',
    'Max pageSize is 500.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      syncType: z
        .enum(['items', 'pages'])
        .default('items')
        .describe('Type of content to sync: "items" for content items or "pages" for pages'),
      syncToken: z
        .string()
        .default('0')
        .describe('Sync token from previous sync call. Use "0" for initial full sync.'),
      pageSize: z.number().optional().describe('Number of items per sync page (max 500)'),
      locale: z.string().optional().describe('Locale code override'),
      apiType: z
        .enum(['fetch', 'preview'])
        .default('fetch')
        .describe('Use "fetch" for published or "preview" for staging content')
    })
  )
  .output(
    z.object({
      items: z.array(z.any()).describe('Array of synced content items or pages'),
      syncToken: z.string().describe('Token to use for the next sync call')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FetchClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.input.locale || ctx.config.locale,
      region: ctx.auth.region,
      apiType: ctx.input.apiType
    });

    let result =
      ctx.input.syncType === 'pages'
        ? await client.syncPages(ctx.input.syncToken, ctx.input.pageSize)
        : await client.syncContentItems(ctx.input.syncToken, ctx.input.pageSize);

    let items = result.items || [];
    let syncToken = result.syncToken || '0';

    return {
      output: {
        items,
        syncToken
      },
      message: `Synced **${items.length}** ${ctx.input.syncType}. New sync token: \`${syncToken}\``
    };
  })
  .build();
