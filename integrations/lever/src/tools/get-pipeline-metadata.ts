import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPipelineMetadataTool = SlateTool.create(spec, {
  name: 'Get Pipeline Metadata',
  key: 'get_pipeline_metadata',
  description: `Retrieve pipeline configuration metadata from Lever including stages, archive reasons, sources, and tags. Select which types of metadata to fetch. Useful for looking up stage IDs, archive reason IDs, and available tags/sources.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      include: z
        .array(z.enum(['stages', 'archiveReasons', 'sources', 'tags']))
        .describe('Types of metadata to include')
    })
  )
  .output(
    z.object({
      stages: z.array(z.any()).optional().describe('Pipeline stages'),
      archiveReasons: z.array(z.any()).optional().describe('Archive reasons'),
      sources: z.array(z.any()).optional().describe('Candidate sources'),
      tags: z.array(z.any()).optional().describe('Tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });
    let output: Record<string, any> = {};
    let parts: string[] = [];

    let fetches = ctx.input.include.map(async type => {
      if (type === 'stages') {
        let result = await client.listStages();
        output.stages = result.data || [];
        parts.push(`${(result.data || []).length} stages`);
      } else if (type === 'archiveReasons') {
        let result = await client.listArchiveReasons();
        output.archiveReasons = result.data || [];
        parts.push(`${(result.data || []).length} archive reasons`);
      } else if (type === 'sources') {
        let result = await client.listSources();
        output.sources = result.data || [];
        parts.push(`${(result.data || []).length} sources`);
      } else if (type === 'tags') {
        let result = await client.listTags();
        output.tags = result.data || [];
        parts.push(`${(result.data || []).length} tags`);
      }
    });

    await Promise.all(fetches);

    return {
      output: output as any,
      message: `Retrieved: ${parts.join(', ')}.`
    };
  })
  .build();
