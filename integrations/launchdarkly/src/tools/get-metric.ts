import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { requireProjectKey } from '../lib/inputs';
import { spec } from '../spec';

export let getMetric = SlateTool.create(spec, {
  name: 'Get Metric',
  key: 'get_metric',
  description:
    'Retrieve a LaunchDarkly metric and its event definition, numeric settings, version, and usage details. Call list_metrics to discover metric keys.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectKey: z
        .string()
        .optional()
        .describe('Project key from list_projects. Falls back to config default.'),
      metricKey: z.string().describe('Metric key from list_metrics'),
      expand: z
        .string()
        .optional()
        .describe(
          'Comma-separated optional details: experiments, experimentCount, metricGroups, metricGroupCount, eventSources, guardedRollouts, guardedRolloutCount, lastUsedInExperiment, lastUsedInGuardedRollout'
        ),
      versionId: z.string().optional().describe('Specific metric version ID to retrieve')
    })
  )
  .output(
    z.object({
      metricKey: z.string().describe('Metric key'),
      metricId: z.string().optional().describe('Metric ID'),
      versionId: z.string().optional().describe('Metric version ID'),
      name: z.string().describe('Metric name'),
      kind: z.string().describe('Event type tracked by the metric'),
      description: z.string().optional().describe('Metric description'),
      tags: z.array(z.string()).describe('Metric tags'),
      archived: z.boolean().describe('Whether the metric is archived'),
      creationDate: z.string().describe('Creation timestamp in Unix milliseconds'),
      metric: z
        .record(z.string(), z.any())
        .describe('Complete metric details, including requested expansions')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = requireProjectKey(ctx.input.projectKey, ctx.config.projectKey);
    let client = new LaunchDarklyClient(ctx.auth.token, ctx.auth.baseUrl);
    let metric = await client.getMetric(projectKey, ctx.input.metricKey, {
      expand: ctx.input.expand,
      versionId: ctx.input.versionId
    });

    return {
      output: {
        metricKey: metric.key,
        metricId: metric._id,
        versionId: metric._versionId,
        name: metric.name,
        kind: metric.kind,
        description: metric.description,
        tags: metric.tags ?? [],
        archived: metric.archived ?? false,
        creationDate: String(metric._creationDate),
        metric
      },
      message: `Retrieved metric **${metric.name}** (\`${metric.key}\`) in project \`${projectKey}\`.`
    };
  })
  .build();
