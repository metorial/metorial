import { SlateTool } from 'slates';
import { z } from 'zod';
import { SegmentClient } from '../lib/client';
import { spec } from '../spec';

export let listSources = SlateTool.create(spec, {
  name: 'List Sources',
  key: 'list_sources',
  description: `List all data sources in the Segment workspace. Returns source details including name, slug, enabled status, write keys, and connected destinations/warehouses metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      count: z.number().optional().describe('Number of sources to return per page (max 200)')
    })
  )
  .output(
    z.object({
      sources: z
        .array(
          z.object({
            sourceId: z.string().describe('Source ID'),
            sourceName: z.string().optional().describe('Display name'),
            sourceSlug: z.string().optional().describe('URL-friendly slug'),
            enabled: z.boolean().optional().describe('Whether the source is enabled'),
            writeKeys: z.array(z.string()).optional().describe('Write keys'),
            metadataId: z.string().optional().describe('Catalog metadata ID')
          })
        )
        .describe('List of sources'),
      totalCount: z.number().optional().describe('Total number of sources')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SegmentClient(ctx.auth.token, ctx.config.region);
    let result = await client.listSources({ count: ctx.input.count });

    let sources = (result?.sources ?? []).map((s: any) => ({
      sourceId: s.id,
      sourceName: s.name,
      sourceSlug: s.slug,
      enabled: s.enabled,
      writeKeys: s.writeKeys ?? [],
      metadataId: s.metadata?.id
    }));

    return {
      output: {
        sources,
        totalCount: sources.length
      },
      message: `Found **${sources.length}** sources in the workspace`
    };
  })
  .build();
