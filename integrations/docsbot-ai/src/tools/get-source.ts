import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { resolveTeamId, sourceDetailsSchema, teamIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getSource = SlateTool.create(spec, {
  name: 'Get Source',
  key: 'get_source',
  description:
    'Inspect a training source, including ingest progress, warnings, indexed URLs, FAQ pairs, and multi-file filenames. Call list_teams to discover team IDs and list_sources to discover source IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      teamId: teamIdSchema,
      botId: z.string().describe('Bot ID from list_bots'),
      sourceId: z.string().describe('Source ID from list_sources')
    })
  )
  .output(sourceDetailsSchema)
  .handleInvocation(async ctx => {
    let client = new DocsBotAdminClient(ctx.auth.token);
    let source = await client.getSource(
      resolveTeamId(ctx.input.teamId, ctx.config.teamId),
      ctx.input.botId,
      ctx.input.sourceId
    );
    return {
      output: {
        sourceId: source.id,
        type: source.type,
        status: source.status,
        title: source.title ?? undefined,
        url: source.url ?? undefined,
        createdAt: source.createdAt,
        pageCount: source.pageCount,
        chunkCount: source.chunkCount,
        scheduleInterval: source.scheduleInterval,
        faqs: source.faqs,
        indexedUrls: source.indexedUrls,
        warnsList: source.warnsList,
        files: source.files,
        processedPages: source.processedPages
      },
      message: `Retrieved source \`${source.id}\` (${source.status})`
    };
  })
  .build();
