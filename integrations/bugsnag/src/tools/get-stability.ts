import { createApiServiceError, SlateTool } from 'slates';
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
        .describe(
          'Legacy field: this endpoint reports only the project primary release stage; omit this field'
        )
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
    let client = new BugsnagClient(ctx.auth);
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw createApiServiceError('Project ID is required.');

    if (ctx.input.releaseStage !== undefined)
      throw createApiServiceError(
        'Bugsnag stability trend reports only the primary release stage and does not support a release-stage filter. Omit releaseStage.',
        { reason: 'unsupported_parameter' }
      );
    let stability = await client.getProjectStability(projectId);

    return {
      output: { stabilityTrend: stability },
      message: `Retrieved stability trend data for the project.`
    };
  })
  .build();
