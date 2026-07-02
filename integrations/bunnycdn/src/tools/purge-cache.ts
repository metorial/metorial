import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoreClient } from '../lib/client';
import { spec } from '../spec';

export let purgeCache = SlateTool.create(spec, {
  name: 'Purge Cache',
  key: 'purge_cache',
  description: `Purge cached content from the CDN. Supports purging a specific URL or an entire pull zone's cache. Optionally filter by cache tag when purging a pull zone. Use this after updating content at the origin to ensure fresh content is served.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['purge_url', 'purge_pull_zone'])
        .describe('Whether to purge a single URL or an entire pull zone'),
      url: z
        .string()
        .optional()
        .describe('The full CDN URL to purge (required for purge_url)'),
      pullZoneId: z
        .number()
        .optional()
        .describe('The pull zone ID to purge (required for purge_pull_zone)'),
      cacheTag: z
        .string()
        .optional()
        .describe(
          'Only purge items with this cache tag (purge_pull_zone only). If omitted, the entire zone cache is purged.'
        )
    })
  )
  .output(
    z.object({
      purged: z.boolean().describe('Whether the purge was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoreClient({ token: ctx.auth.token });

    if (ctx.input.action === 'purge_url') {
      await client.purgeUrl(ctx.input.url!);
      return {
        output: { purged: true },
        message: `Purged cached content for URL: **${ctx.input.url}**`
      };
    } else {
      await client.purgePullZoneCache(ctx.input.pullZoneId!, ctx.input.cacheTag);
      let tagInfo = ctx.input.cacheTag ? ` (cache tag: ${ctx.input.cacheTag})` : '';
      return {
        output: { purged: true },
        message: `Purged entire cache for pull zone **${ctx.input.pullZoneId}**${tagInfo}.`
      };
    }
  })
  .build();
