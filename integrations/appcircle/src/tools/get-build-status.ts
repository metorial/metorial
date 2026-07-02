import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getBuildStatus = SlateTool.create(spec, {
  name: 'Get Build Status',
  key: 'get_build_status',
  description: `Retrieves the current status of a specific build. Use this to check whether a build is queued, running, succeeded, failed, or canceled.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      commitId: z.string().describe('Commit ID associated with the build'),
      buildId: z.string().describe('ID of the build')
    })
  )
  .output(
    z
      .object({
        status: z.string().optional(),
        buildId: z.string().optional(),
        commitId: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        duration: z.number().optional()
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let status = await client.getBuildStatus(ctx.input.commitId, ctx.input.buildId);

    return {
      output: status,
      message: `Build **${ctx.input.buildId}** status: **${status?.status ?? 'unknown'}**.`
    };
  })
  .build();
