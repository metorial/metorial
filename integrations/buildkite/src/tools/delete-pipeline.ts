import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deletePipeline = SlateTool.create(spec, {
  name: 'Delete Pipeline',
  key: 'delete_pipeline',
  description: `Permanently delete a Buildkite pipeline. This action is irreversible and will remove all associated builds and data. Consider archiving instead if you may need the data later.`,
  constraints: [
    'This action is irreversible. All builds and associated data will be permanently deleted.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      pipelineSlug: z.string().describe('Slug of the pipeline to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the pipeline was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    await client.deletePipeline(ctx.input.pipelineSlug);

    return {
      output: { deleted: true },
      message: `Deleted pipeline \`${ctx.input.pipelineSlug}\`.`
    };
  });
