import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { requireEnvironmentKey, requireProjectKey } from '../lib/inputs';
import { spec } from '../spec';

export let getExperiment = SlateTool.create(spec, {
  name: 'Get Experiment',
  key: 'get_experiment',
  description:
    'Retrieve a LaunchDarkly experiment, including its current iteration and optional treatment, metric, analysis, and previous-iteration details. Call list_experiments to discover experiment keys.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectKey: z
        .string()
        .optional()
        .describe('Project key from list_projects. Falls back to config default.'),
      environmentKey: z
        .string()
        .optional()
        .describe('Environment key from list_environments. Falls back to config default.'),
      experimentKey: z.string().describe('Experiment key from list_experiments'),
      expand: z
        .string()
        .optional()
        .describe(
          'Comma-separated optional details: previousIterations, draftIteration, secondaryMetrics, treatments, analysisConfig'
        )
    })
  )
  .output(
    z.object({
      experimentKey: z.string().describe('Experiment key'),
      experimentId: z.string().optional().describe('Experiment ID'),
      name: z.string().describe('Experiment name'),
      description: z.string().optional().describe('Experiment description'),
      environmentKey: z.string().describe('Environment containing the experiment'),
      maintainerId: z.string().optional().describe('Member ID of the experiment maintainer'),
      creationDate: z.string().describe('Creation timestamp in Unix milliseconds'),
      currentIteration: z
        .record(z.string(), z.any())
        .optional()
        .describe('Current iteration with IDs, status, metrics, and requested treatment data'),
      experiment: z
        .record(z.string(), z.any())
        .describe('Complete experiment details, including requested expansions')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = requireProjectKey(ctx.input.projectKey, ctx.config.projectKey);
    let environmentKey = requireEnvironmentKey(
      ctx.input.environmentKey,
      ctx.config.environmentKey
    );
    let client = new LaunchDarklyClient(ctx.auth.token, ctx.auth.baseUrl);
    let experiment = await client.getExperiment(
      projectKey,
      environmentKey,
      ctx.input.experimentKey,
      { expand: ctx.input.expand }
    );

    return {
      output: {
        experimentKey: experiment.key,
        experimentId: experiment._id,
        name: experiment.name,
        description: experiment.description,
        environmentKey: experiment.environmentKey,
        maintainerId: experiment._maintainerId,
        creationDate: String(experiment._creationDate),
        currentIteration: experiment.currentIteration,
        experiment
      },
      message: `Retrieved experiment **${experiment.name}** (\`${experiment.key}\`) in \`${environmentKey}\`.`
    };
  })
  .build();
