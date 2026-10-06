import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { organizationInput } from '../lib/schemas';
import { spec } from '../spec';

export let manageBuild = SlateTool.create(spec, {
  name: 'Manage Build',
  key: 'manage_build',
  description: `Request cancellation of a scheduled, running or failing Buildkite build, or rebuild it with its original commit, branch and settings. Cancellation can return an intermediate canceling state; call get_build to check completion. Rebuild creates a new build without fetching a newer branch commit.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      ...organizationInput,
      pipelineSlug: z.string().describe('Pipeline slug from list_pipelines'),
      buildNumber: z
        .number()
        .describe('Pipeline build number from list_builds, not a build UUID'),
      action: z.enum(['cancel', 'rebuild']).describe('Action to perform on the build')
    })
  )
  .output(
    z.object({
      buildId: z.string().describe('UUID of the build'),
      buildNumber: z.number().describe('Build number'),
      state: z.string().describe('Current state of the build after the action'),
      webUrl: z.string().describe('URL to the build on Buildkite')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    const b =
      ctx.input.action === 'cancel'
        ? await client.cancelBuild(ctx.input.pipelineSlug, ctx.input.buildNumber)
        : await client.rebuildBuild(ctx.input.pipelineSlug, ctx.input.buildNumber);

    return {
      output: {
        buildId: b.id,
        buildNumber: b.number,
        state: b.state,
        webUrl: b.web_url
      },
      message:
        ctx.input.action === 'cancel'
          ? `Requested cancellation of build **#${ctx.input.buildNumber}**; current state is **${b.state}**.`
          : `Rebuilt build **#${ctx.input.buildNumber}** → new build **#${b.number}**.`
    };
  });
