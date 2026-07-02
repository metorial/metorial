import { SlateTool } from 'slates';
import { z } from 'zod';
import { TravisCIClient } from '../lib/client';
import { spec } from '../spec';

export let manageBuild = SlateTool.create(spec, {
  name: 'Manage Build',
  key: 'manage_build',
  description: `Cancel or restart a Travis CI build. Use this to stop a running build or re-run a completed/canceled build.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      buildId: z.string().describe('Numeric build ID.'),
      action: z.enum(['cancel', 'restart']).describe('Action to perform on the build.')
    })
  )
  .output(
    z.object({
      buildId: z.number().describe('Build ID'),
      buildNumber: z.string().optional().describe('Build number'),
      state: z.string().optional().describe('Build state after action'),
      repositorySlug: z.string().optional().describe('Repository slug')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TravisCIClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result: any;
    if (ctx.input.action === 'cancel') {
      result = await client.cancelBuild(ctx.input.buildId);
    } else {
      result = await client.restartBuild(ctx.input.buildId);
    }

    let build = result.build || result;

    return {
      output: {
        buildId: build.id || Number(ctx.input.buildId),
        buildNumber: build.number,
        state: build.state,
        repositorySlug: build.repository?.slug
      },
      message: `Build **#${build.number || ctx.input.buildId}** has been **${ctx.input.action === 'cancel' ? 'cancelled' : 'restarted'}**.`
    };
  })
  .build();
