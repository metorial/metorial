import { z } from 'zod';
import {
  branchPullRequestInputs,
  createClient,
  mapMeasure,
  mapMetric,
  measureSchema,
  metricSchema,
  pageSchema,
  paginationInputs,
  projectInput,
  projectKeyFromInput,
  rawRecordSchema,
  readOnlyTool
} from './shared';

let optionalRecord = (value: unknown) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

let firstPeriodRecord = (measure: Record<string, unknown>) => {
  let period = optionalRecord(measure.period);
  if (period) return period;

  if (!Array.isArray(measure.periods)) return undefined;
  return measure.periods.find(
    (item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null && !Array.isArray(item)
  );
};

export let mapMeasureWithPeriodVariants = (measure: Record<string, unknown>) => {
  let mapped = mapMeasure(measure);
  let period = firstPeriodRecord(measure);

  return {
    ...mapped,
    bestValue:
      mapped.bestValue ??
      (typeof period?.bestValue === 'boolean' ? period.bestValue : undefined),
    periodValue:
      mapped.periodValue ?? (typeof period?.value === 'string' ? period.value : undefined)
  };
};

export let listMetricsTool = readOnlyTool({
  name: 'List Metrics',
  key: 'list_metrics',
  description:
    'List SonarQube metric keys that can be requested from get_project_measures and search_measure_history, such as coverage, bugs, vulnerabilities, code smells, duplicated lines density, and ncloc.'
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Search text for metric key or name. Use this to discover valid metricKeys.'
        ),
      ...paginationInputs(100, 500)
    })
  )
  .output(
    z.object({
      metrics: z.array(metricSchema).describe('Available SonarQube metrics.'),
      page: pageSchema.optional().describe('Pagination details.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listMetrics(ctx.input);
    let metrics = result.items.map(mapMetric);

    return {
      output: {
        metrics,
        page: result.page
      },
      message: `Found **${metrics.length}** SonarQube metrics.`
    };
  })
  .build();

export let getProjectMeasuresTool = readOnlyTool({
  name: 'Get Project Measures',
  key: 'get_project_measures',
  description:
    'Get current metric measures for an exact SonarQube project key, optionally scoped to one branch or one pull request. Use search_projects first when the user gave a project name or partial key; use list_metrics first when metric keys are unknown.',
  instructions: [
    'Request only the metrics the user asked for. Do not send a broad all-metrics list unless the user explicitly asks for every metric.',
    'Do not guess branch names such as main or master; omit branch for the default branch unless the user provided or discovered a branch.'
  ]
})
  .input(
    z.object({
      ...projectInput,
      metricKeys: z
        .array(z.string())
        .min(1)
        .describe(
          'Metric keys to fetch, for example ncloc, coverage, bugs, or vulnerabilities. Use list_metrics to discover valid keys.'
        ),
      ...branchPullRequestInputs
    })
  )
  .output(
    z.object({
      projectKey: z.string().describe('Project key used for the request.'),
      componentKey: z.string().optional().describe('Component key returned by SonarQube.'),
      componentName: z.string().optional().describe('Component name returned by SonarQube.'),
      measures: z.array(measureSchema).describe('Metric measures for the component.'),
      raw: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = projectKeyFromInput(ctx.config, ctx.input);
    let client = createClient(ctx);
    let data = await client.getProjectMeasures({
      projectKey,
      metricKeys: ctx.input.metricKeys,
      branch: ctx.input.branch,
      pullRequest: ctx.input.pullRequest
    });
    let component =
      typeof data.component === 'object' && data.component !== null
        ? (data.component as Record<string, unknown>)
        : {};
    let measures = Array.isArray(component.measures)
      ? component.measures
          .filter(
            (item): item is Record<string, unknown> =>
              typeof item === 'object' && item !== null
          )
          .map(mapMeasureWithPeriodVariants)
      : [];

    return {
      output: {
        projectKey,
        componentKey: typeof component.key === 'string' ? component.key : undefined,
        componentName: typeof component.name === 'string' ? component.name : undefined,
        measures,
        raw: data
      },
      message: `Retrieved **${measures.length}** measures for SonarQube project **${projectKey}**.`
    };
  })
  .build();

export let searchMeasureHistoryTool = readOnlyTool({
  name: 'Search Measure History',
  key: 'search_measure_history',
  description:
    'Search historical SonarQube measures for an exact project key over time, optionally scoped to one branch or one pull request. Use search_projects first when the user gave a project name or partial key; use get_project_measures for current values.',
  instructions: [
    'Request only the metrics the user asked for. Do not send a broad all-metrics list unless the user explicitly asks for every metric.',
    'Do not guess branch names such as main or master; omit branch for the default branch unless the user provided or discovered a branch.'
  ]
})
  .input(
    z.object({
      ...projectInput,
      metricKeys: z
        .array(z.string())
        .min(1)
        .describe(
          'Metric keys to fetch history for. Use list_metrics to discover valid keys.'
        ),
      from: z.string().optional().describe('Start date/time for history search.'),
      to: z.string().optional().describe('End date/time for history search.'),
      ...branchPullRequestInputs,
      ...paginationInputs(100, 1000)
    })
  )
  .output(
    z.object({
      projectKey: z.string().describe('Project key used for the request.'),
      measures: z
        .array(
          z.object({
            metric: z.string().describe('Metric key.'),
            history: z
              .array(
                z.object({
                  date: z.string().optional().describe('Measure timestamp.'),
                  value: z.string().optional().describe('Measure value.'),
                  raw: rawRecordSchema
                })
              )
              .describe('Historical values for the metric.'),
            raw: rawRecordSchema
          })
        )
        .describe('Historical measures grouped by metric.'),
      page: pageSchema.optional().describe('Pagination details.'),
      raw: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = projectKeyFromInput(ctx.config, ctx.input);
    let client = createClient(ctx);
    let result = await client.searchMeasureHistory({
      projectKey,
      metricKeys: ctx.input.metricKeys,
      from: ctx.input.from,
      to: ctx.input.to,
      branch: ctx.input.branch,
      pullRequest: ctx.input.pullRequest,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });
    let data = result.data as Record<string, unknown>;
    let measures = Array.isArray(data.measures)
      ? data.measures
          .filter(
            (item): item is Record<string, unknown> =>
              typeof item === 'object' && item !== null
          )
          .map(measure => ({
            metric: String(measure.metric ?? ''),
            history: Array.isArray(measure.history)
              ? measure.history
                  .filter(
                    (item): item is Record<string, unknown> =>
                      typeof item === 'object' && item !== null
                  )
                  .map(item => ({
                    date: typeof item.date === 'string' ? item.date : undefined,
                    value: typeof item.value === 'string' ? item.value : undefined,
                    raw: item
                  }))
              : [],
            raw: measure
          }))
      : [];

    return {
      output: {
        projectKey,
        measures,
        page: result.page,
        raw: data
      },
      message: `Retrieved measure history for **${measures.length}** metrics in SonarQube project **${projectKey}**.`
    };
  })
  .build();
