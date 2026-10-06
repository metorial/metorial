import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { organizationInput } from '../lib/schemas';
import { spec } from '../spec';

export let archivePipeline = SlateTool.create(spec, {
  name: 'Archive Pipeline',
  key: 'archive_pipeline',
  description: `Archive or unarchive a Buildkite pipeline. Archived pipelines are hidden from the dashboard but retain their data and can be unarchived later.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      ...organizationInput,
      pipelineSlug: z.string().describe('Slug of the pipeline to archive or unarchive'),
      action: z
        .enum(['archive', 'unarchive'])
        .describe('Whether to archive or unarchive the pipeline')
    })
  )
  .output(
    z.object({
      pipelineId: z.string().describe('UUID of the pipeline'),
      pipelineSlug: z.string().describe('Pipeline slug from list_pipelines'),
      name: z.string().describe('Name of the pipeline'),
      archived: z.boolean().describe('Whether the pipeline is now archived')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let p =
      ctx.input.action === 'archive'
        ? await client.archivePipeline(ctx.input.pipelineSlug)
        : await client.unarchivePipeline(ctx.input.pipelineSlug);

    return {
      output: {
        pipelineId: p.id,
        pipelineSlug: p.slug,
        name: p.name,
        archived:
          p.archived_at === undefined ? ctx.input.action === 'archive' : p.archived_at !== null
      },
      message: `${ctx.input.action === 'archive' ? 'Archived' : 'Unarchived'} pipeline **${p.name}**.`
    };
  });
