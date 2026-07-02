import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { spec } from '../spec';

export let listMetrics = SlateTool.create(spec, {
  name: 'List Metrics',
  key: 'list_metrics',
  description: `List custom metrics defined in a LaunchDarkly project. Metrics track events in your application and are used in experiments to measure the impact of flag variations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectKey: z.string().optional().describe('Project key. Falls back to config default.'),
      limit: z.number().optional().describe('Maximum number of metrics to return'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      metrics: z.array(
        z.object({
          metricKey: z.string().describe('Metric key'),
          name: z.string().describe('Metric name'),
          description: z.string().describe('Metric description'),
          kind: z.string().describe('Metric kind (custom, click, pageview)'),
          tags: z.array(z.string()).describe('Tags'),
          isActive: z.boolean().describe('Whether the metric is active'),
          isNumeric: z.boolean().describe('Whether the metric measures numeric values'),
          unit: z.string().optional().describe('Unit for numeric metrics'),
          creationDate: z.string().describe('Creation timestamp')
        })
      ),
      totalCount: z.number().describe('Total number of metrics')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = ctx.input.projectKey ?? ctx.config.projectKey;
    if (!projectKey) {
      throw new Error('projectKey is required.');
    }

    let client = new LaunchDarklyClient(ctx.auth.token);
    let result = await client.listMetrics(projectKey, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let items = result.items ?? [];
    let metrics = items.map((m: any) => ({
      metricKey: m.key,
      name: m.name ?? m.key,
      description: m.description ?? '',
      kind: m.kind,
      tags: m.tags ?? [],
      isActive: m.isActive ?? true,
      isNumeric: m.isNumeric ?? false,
      unit: m.unit,
      creationDate: String(m.creationDate)
    }));

    return {
      output: {
        metrics,
        totalCount: result.totalCount ?? items.length
      },
      message: `Found **${result.totalCount ?? items.length}** metrics in project \`${projectKey}\`.`
    };
  })
  .build();
