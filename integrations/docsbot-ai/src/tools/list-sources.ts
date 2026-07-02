import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { spec } from '../spec';

export let listSources = SlateTool.create(spec, {
  name: 'List Sources',
  key: 'list_sources',
  description: `List all training sources for a specific bot. Returns source type, status, title, URL, page/chunk counts, and schedule interval.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      botId: z.string().describe('Bot ID to list sources for')
    })
  )
  .output(
    z.object({
      sources: z.array(
        z.object({
          sourceId: z.string().describe('Source identifier'),
          type: z
            .string()
            .describe('Source type (url, document, sitemap, wp, urls, csv, rss, qa, youtube)'),
          status: z
            .string()
            .describe('Source status (pending, indexing, processing, ready, failed)'),
          title: z.string().optional().describe('Source title'),
          url: z.string().optional().describe('Source URL'),
          createdAt: z.string().describe('ISO 8601 creation timestamp'),
          pageCount: z.number().describe('Number of pages indexed'),
          chunkCount: z.number().describe('Number of chunks indexed'),
          scheduleInterval: z
            .string()
            .optional()
            .describe('Refresh schedule (daily, weekly, monthly, none)')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocsBotAdminClient(ctx.auth.token);
    let sources = await client.listSources(ctx.config.teamId, ctx.input.botId);

    let mapped = sources.map(s => ({
      sourceId: s.id,
      type: s.type,
      status: s.status,
      title: s.title,
      url: s.url,
      createdAt: s.createdAt,
      pageCount: s.pageCount,
      chunkCount: s.chunkCount,
      scheduleInterval: s.scheduleInterval
    }));

    return {
      output: { sources: mapped },
      message: `Found **${mapped.length}** source(s) for bot \`${ctx.input.botId}\``
    };
  })
  .build();
