import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cloudflareServiceError } from '../lib/errors';
import { spec } from '../spec';

export let purgeCacheTool = SlateTool.create(spec, {
  name: 'Purge Cache',
  key: 'purge_cache',
  description: `Purge cached content for a Cloudflare zone. Supports purging everything, specific URLs, cache tags, or hostnames. Use this to force Cloudflare to re-fetch content from the origin server.`,
  instructions: [
    'Set purgeAll to true to clear the entire cache for the zone.',
    'Alternatively, provide specific URLs, tags, hosts, or prefixes to purge selectively.',
    'Prefix values use host/path form, e.g. "www.example.com/assets".'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      zoneId: z.string().describe('Zone ID to purge cache for'),
      purgeAll: z.boolean().optional().describe('Purge all cached content'),
      urls: z.array(z.string()).optional().describe('Specific URLs to purge from cache'),
      tags: z.array(z.string()).optional().describe('Cache tags to purge'),
      hosts: z.array(z.string()).optional().describe('Hostnames to purge'),
      prefixes: z
        .array(z.string())
        .optional()
        .describe('URL prefixes to purge, in host/path form (e.g. www.example.com/assets)')
    })
  )
  .output(
    z.object({
      zoneId: z.string(),
      purged: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { zoneId } = ctx.input;

    if (ctx.input.purgeAll) {
      await client.purgeAllCache(zoneId);
      return {
        output: { zoneId, purged: true },
        message: `Purged **all** cached content for zone \`${zoneId}\`.`
      };
    }

    if (ctx.input.urls?.length) {
      await client.purgeFilesByUrl(zoneId, ctx.input.urls);
      return {
        output: { zoneId, purged: true },
        message: `Purged **${ctx.input.urls.length}** URL(s) from cache.`
      };
    }

    if (ctx.input.tags?.length) {
      await client.purgeFilesByTags(zoneId, ctx.input.tags);
      return {
        output: { zoneId, purged: true },
        message: `Purged cache for **${ctx.input.tags.length}** tag(s).`
      };
    }

    if (ctx.input.hosts?.length) {
      await client.purgeFilesByHosts(zoneId, ctx.input.hosts);
      return {
        output: { zoneId, purged: true },
        message: `Purged cache for **${ctx.input.hosts.length}** hostname(s).`
      };
    }

    if (ctx.input.prefixes?.length) {
      await client.purgeFilesByPrefixes(zoneId, ctx.input.prefixes);
      return {
        output: { zoneId, purged: true },
        message: `Purged cache for **${ctx.input.prefixes.length}** prefix(es).`
      };
    }

    throw cloudflareServiceError('Specify purgeAll, urls, tags, hosts, or prefixes to purge');
  })
  .build();
