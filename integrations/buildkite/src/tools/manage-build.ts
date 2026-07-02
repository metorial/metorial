import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageBuild = SlateTool.create(spec, {
  name: 'Manage Build',
  key: 'manage_build',
  description: `Cancel or rebuild an existing Buildkite build. Cancel stops a running/scheduled build. Rebuild creates a new build with the same settings as the original.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      pipelineSlug: z.string().describe('Slug of the pipeline'),
      buildNumber: z.number().describe('Build number to manage'),
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
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    let b: any;
    if (ctx.input.action === 'cancel') {
      b = await client.cancelBuild(ctx.input.pipelineSlug, ctx.input.buildNumber);
    } else {
      b = await client.rebuildBuild(ctx.input.pipelineSlug, ctx.input.buildNumber);
    }

    return {
      output: {
        buildId: b.id,
        buildNumber: b.number,
        state: b.state,
        webUrl: b.web_url
      },
      message:
        ctx.input.action === 'cancel'
          ? `Canceled build **#${ctx.input.buildNumber}**.`
          : `Rebuilt build **#${ctx.input.buildNumber}** → new build **#${b.number}**.`
    };
  });
