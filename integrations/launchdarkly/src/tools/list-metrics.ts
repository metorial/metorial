import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { requireProjectKey } from '../lib/inputs';
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
      offset: z.number().optional().describe('Offset for pagination'),
      filter: z
        .string()
        .optional()
        .describe('Metric filter expression, for example `query equals "checkout"`'),
      sort: z
        .string()
        .optional()
        .describe('Sort by createdAt or name; prefix with - for descending')
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
          archived: z.boolean().describe('Whether the metric is archived'),
          isNumeric: z.boolean().describe('Whether the metric measures numeric values'),
          unit: z.string().optional().describe('Unit for numeric metrics'),
          creationDate: z.string().describe('Creation timestamp')
        })
      ),
      totalCount: z.number().describe('Total number of metrics')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = requireProjectKey(ctx.input.projectKey, ctx.config.projectKey);

    let client = new LaunchDarklyClient(ctx.auth.token, ctx.auth.baseUrl);
    let result = await client.listMetrics(projectKey, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      filter: ctx.input.filter,
      sort: ctx.input.sort
    });

    let items = result.items ?? [];
    let metrics = items.map((m: any) => ({
      metricKey: m.key,
      name: m.name ?? m.key,
      description: m.description ?? '',
      kind: m.kind,
      tags: m.tags ?? [],
      isActive: !(m.archived ?? false),
      archived: m.archived ?? false,
      isNumeric: m.isNumeric ?? false,
      unit: m.unit,
      creationDate: String(m._creationDate)
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
