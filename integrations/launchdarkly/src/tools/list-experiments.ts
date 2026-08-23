import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { requireEnvironmentKey, requireProjectKey } from '../lib/inputs';
import { spec } from '../spec';

export let listExperiments = SlateTool.create(spec, {
  name: 'List Experiments',
  key: 'list_experiments',
  description: `List experiments in a LaunchDarkly project and environment. Experiments validate the impact of features by measuring metrics against flag variations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectKey: z.string().optional().describe('Project key. Falls back to config default.'),
      environmentKey: z
        .string()
        .optional()
        .describe('Environment key. Falls back to config default.'),
      limit: z.number().optional().describe('Maximum number of experiments to return'),
      offset: z.number().optional().describe('Offset for pagination'),
      filter: z.string().optional().describe('Filter expression')
    })
  )
  .output(
    z.object({
      experiments: z.array(
        z.object({
          experimentKey: z.string().describe('Experiment key'),
          name: z.string().describe('Experiment name'),
          description: z.string().describe('Experiment description'),
          creationDate: z.string().describe('Creation timestamp'),
          currentIteration: z
            .object({
              status: z.string().optional().describe('Iteration status'),
              hypothesis: z.string().optional().describe('Experiment hypothesis'),
              startDate: z.string().optional().describe('Iteration start date'),
              endDate: z.string().optional().describe('Iteration end date')
            })
            .optional()
            .describe('Current iteration details')
        })
      ),
      totalCount: z.number().describe('Total number of experiments')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = requireProjectKey(ctx.input.projectKey, ctx.config.projectKey);
    let envKey = requireEnvironmentKey(ctx.input.environmentKey, ctx.config.environmentKey);

    let client = new LaunchDarklyClient(ctx.auth.token, ctx.auth.baseUrl);
    let result = await client.listExperiments(projectKey, envKey, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      filter: ctx.input.filter
    });

    let items = result.items ?? [];
    let experiments = items.map((e: any) => {
      let currentIteration = e.currentIteration ?? e.iterations?.[0];
      return {
        experimentKey: e.key,
        name: e.name,
        description: e.description ?? '',
        creationDate: String(e._creationDate),
        currentIteration: currentIteration
          ? {
              status: currentIteration.status,
              hypothesis: currentIteration.hypothesis,
              startDate: currentIteration.startedAt
                ? String(currentIteration.startedAt)
                : undefined,
              endDate: currentIteration.endedAt ? String(currentIteration.endedAt) : undefined
            }
          : undefined
      };
    });

    return {
      output: {
        experiments,
        totalCount: result.total_count ?? result.totalCount ?? items.length
      },
      message: `Found **${result.total_count ?? result.totalCount ?? items.length}** experiments in \`${envKey}\`.`
    };
  })
  .build();
