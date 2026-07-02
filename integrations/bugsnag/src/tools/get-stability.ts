import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import { spec } from '../spec';

export let getStability = SlateTool.create(spec, {
  name: 'Get Project Stability',
  key: 'get_stability',
  description: `Get the stability trend for a Bugsnag project including release information, session counts, and stability scores over time. Useful for monitoring overall application health and release quality.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID'),
      releaseStage: z
        .string()
        .optional()
        .describe('Filter by release stage (e.g., production)')
    })
  )
  .output(
    z.object({
      stabilityTrend: z
        .any()
        .describe('Stability trend data including release stability scores')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient({ token: ctx.auth.token });
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw new Error('Project ID is required.');

    let stability = await client.getProjectStability(projectId, {
      releaseStage: ctx.input.releaseStage
    });

    return {
      output: { stabilityTrend: stability },
      message: `Retrieved stability trend data for the project.`
    };
  })
  .build();
