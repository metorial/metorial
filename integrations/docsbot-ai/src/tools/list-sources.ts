import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { resolveTeamId, sourceSummarySchema, teamIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listSources = SlateTool.create(spec, {
  name: 'List Sources',
  key: 'list_sources',
  description: `List a page of training sources for a bot. Call list_teams to discover team IDs. Returns source status and indexing counts, with pagination for retrieving the next page.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: teamIdSchema,
      botId: z.string().describe('Bot ID to list sources for'),
      page: z.number().optional().describe('Zero-based page index (default: 0)'),
      limit: z.number().optional().describe('Sources per page (default: 100)')
    })
  )
  .output(
    z.object({
      sources: z.array(sourceSummarySchema),
      totalCount: z.number().optional().describe('Total number of sources'),
      hasMorePages: z.boolean().optional().describe('Whether another page is available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocsBotAdminClient(ctx.auth.token);
    let result = await client.listSources(
      resolveTeamId(ctx.input.teamId, ctx.config.teamId),
      ctx.input.botId,
      { page: ctx.input.page, limit: ctx.input.limit }
    );

    let mapped = result.sources.map(s => ({
      sourceId: s.id,
      type: s.type,
      status: s.status,
      title: s.title ?? undefined,
      url: s.url ?? undefined,
      createdAt: s.createdAt,
      pageCount: s.pageCount,
      chunkCount: s.chunkCount,
      scheduleInterval: s.scheduleInterval
    }));

    return {
      output: {
        sources: mapped,
        totalCount: result.pagination.totalCount,
        hasMorePages: result.pagination.hasMorePages
      },
      message: `Found **${mapped.length}** source(s) for bot \`${ctx.input.botId}\``
    };
  })
  .build();
