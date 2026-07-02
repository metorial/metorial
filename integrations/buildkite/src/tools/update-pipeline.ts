import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updatePipeline = SlateTool.create(spec, {
  name: 'Update Pipeline',
  key: 'update_pipeline',
  description: `Update an existing Buildkite pipeline's settings. Supports changing the name, repository, YAML configuration, branch settings, tags, and visibility. Only provided fields are updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      pipelineSlug: z.string().describe('Slug of the pipeline to update'),
      name: z.string().optional().describe('New name for the pipeline'),
      repository: z.string().optional().describe('New repository URL'),
      configuration: z.string().optional().describe('Updated pipeline YAML configuration'),
      description: z.string().optional().describe('Updated description'),
      defaultBranch: z.string().optional().describe('Updated default branch'),
      branchConfiguration: z.string().optional().describe('Updated branch filter pattern'),
      skipQueuedBranchBuilds: z
        .boolean()
        .optional()
        .describe('Skip queued branch builds when a new commit is pushed'),
      cancelRunningBranchBuilds: z
        .boolean()
        .optional()
        .describe('Cancel running builds when a new commit is pushed'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
      visibility: z.enum(['private', 'public']).optional().describe('Updated visibility')
    })
  )
  .output(
    z.object({
      pipelineId: z.string().describe('UUID of the updated pipeline'),
      pipelineSlug: z.string().describe('Slug of the updated pipeline'),
      name: z.string().describe('Name of the pipeline'),
      webUrl: z.string().describe('URL to the pipeline on Buildkite')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    let { pipelineSlug, ...updateData } = ctx.input;
    let p = await client.updatePipeline(pipelineSlug, updateData);

    return {
      output: {
        pipelineId: p.id,
        pipelineSlug: p.slug,
        name: p.name,
        webUrl: p.web_url
      },
      message: `Updated pipeline **${p.name}** (\`${p.slug}\`).`
    };
  });
