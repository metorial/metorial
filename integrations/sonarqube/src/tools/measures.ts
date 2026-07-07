import { z } from 'zod';
import { sonarqubeValidationError } from '../lib/errors';
import {
  branchPullRequestInputs,
  createClient,
  projectInput,
  projectKeyFromInput,
  readOnlyTool
} from './shared';

let requiredMetricString = (metric: Record<string, unknown>, field: string) => {
  let value = metric[field];
  if (typeof value !== 'string') {
    throw sonarqubeValidationError(`SonarQube response did not include metric ${field}.`);
  }
  return value;
};

let optionalMetricString = (metric: Record<string, unknown>, field: string) => {
  let value = metric[field];
  return typeof value === 'string' ? value : undefined;
};

let metricBoolean = (metric: Record<string, unknown>, field: string) => metric[field] === true;

export let mapSearchMetric = (metric: Record<string, unknown>) => ({
  id: requiredMetricString(metric, 'id'),
  key: requiredMetricString(metric, 'key'),
  name: requiredMetricString(metric, 'name'),
  description: optionalMetricString(metric, 'description'),
  domain: optionalMetricString(metric, 'domain'),
  type: requiredMetricString(metric, 'type'),
  hidden: metricBoolean(metric, 'hidden'),
  custom: metricBoolean(metric, 'custom')
});

export let listMetricsTool = readOnlyTool({
  name: 'Search SonarQube Metrics',
  key: 'search_metrics',
  description: 'Search for available metrics'
})
  .input(
    z.object({
      p: z.number().int().positive().optional().describe('1-based page number (default: 1)'),
      ps: z
        .number()
        .int()
        .positive()
        .max(500)
        .optional()
        .describe(
          'Page size. Must be greater than 0 and less than or equal to 500 (default: 100)'
        )
    })
  )
  .output(
    z.object({
      metrics: z
        .array(
          z.object({
            id: z.string().describe('Metric unique identifier'),
            key: z.string().describe('Metric key'),
            name: z.string().describe('Metric display name'),
            description: z.string().optional().describe('Metric description'),
            domain: z.string().optional().describe('Metric domain/category'),
            type: z.string().describe('Metric value type'),
            hidden: z.boolean().describe('Whether the metric is hidden'),
            custom: z.boolean().describe('Whether this is a custom metric')
          })
        )
        .describe('List of metrics matching the search'),
      total: z.number().int().describe('Total number of metrics'),
      page: z.number().int().describe('Current page number'),
      pageSize: z.number().int().describe('Number of items per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listMetrics({ page: ctx.input.p, pageSize: ctx.input.ps });
    let page = result.page;

    if (page?.total === undefined || page.page === undefined || page.pageSize === undefined) {
      throw sonarqubeValidationError(
        'SonarQube response did not include metrics pagination details.'
      );
    }

    let metrics = result.items.map(mapSearchMetric);

    return {
      output: {
        metrics,
        total: page.total,
        page: page.page,
        pageSize: page.pageSize
      },
      message: `Found **${metrics.length}** SonarQube metrics.`
    };
  })
  .build();

export let getProjectMeasuresTool = readOnlyTool({
  name: 'Get SonarQube Project Measures',
  key: 'get_component_measures',
  description:
    'Get SonarQube measures for a project, such as ncloc, complexity, violations, coverage, etc.'
})
  .input(
    z.object({
      ...projectInput,
      ...branchPullRequestInputs,
      metricKeys: z
        .array(z.string())
        .optional()
        .describe('The metric keys to retrieve (e.g. ncloc, complexity, violations, coverage)')
    })
  )
  .output(
    z.object({
      component: z
        .object({
          key: z.string().describe('Component key'),
          name: z.string().describe('Component display name'),
          qualifier: z
            .string()
            .describe('Component qualifier (TRK for project, FIL for file, etc.)'),
          description: z.string().optional().describe('Component description'),
          language: z.string().optional().describe('Programming language'),
          path: z.string().optional().describe('Component path')
        })
        .describe('Component information'),
      measures: z
        .array(
          z.object({
            metric: z.string().describe('Metric key'),
            value: z.string().optional().describe('Measure value')
          })
        )
        .describe('List of measures for the component'),
      metrics: z
        .array(
          z.object({
            key: z.string().describe('Metric key'),
            name: z.string().describe('Metric display name'),
            description: z.string().describe('Metric description'),
            domain: z.string().describe('Metric domain/category'),
            type: z.string().describe('Metric value type'),
            hidden: z.boolean().describe('Whether the metric is hidden'),
            custom: z.boolean().describe('Whether this is a custom metric')
          })
        )
        .optional()
        .describe('Metadata about the metrics')
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

    let requiredString = (record: Record<string, unknown>, field: string) => {
      let value = record[field];
      return typeof value === 'string' ? value : '';
    };

    let optionalString = (record: Record<string, unknown>, field: string) => {
      let value = record[field];
      return typeof value === 'string' ? value : undefined;
    };

    let requiredBoolean = (record: Record<string, unknown>, field: string) => {
      let value = record[field];
      return typeof value === 'boolean' ? value : false;
    };

    let component =
      typeof data.component === 'object' && data.component !== null
        ? (data.component as Record<string, unknown>)
        : undefined;

    if (!component) {
      return {
        output: {
          component: {
            key: '',
            name: '',
            qualifier: ''
          },
          measures: []
        },
        message: `Retrieved **0** measures for SonarQube project **${projectKey}**.`
      };
    }

    let measures = Array.isArray(component.measures)
      ? component.measures
          .filter(
            (item): item is Record<string, unknown> =>
              typeof item === 'object' && item !== null
          )
          .map(measure => ({
            metric: requiredString(measure, 'metric'),
            value: optionalString(measure, 'value')
          }))
      : [];
    let metrics = Array.isArray(data.metrics)
      ? data.metrics
          .filter(
            (item): item is Record<string, unknown> =>
              typeof item === 'object' && item !== null
          )
          .map(metric => ({
            key: requiredString(metric, 'key'),
            name: requiredString(metric, 'name'),
            description: requiredString(metric, 'description'),
            domain: requiredString(metric, 'domain'),
            type: requiredString(metric, 'type'),
            hidden: requiredBoolean(metric, 'hidden'),
            custom: requiredBoolean(metric, 'custom')
          }))
      : undefined;

    return {
      output: {
        component: {
          key: requiredString(component, 'key'),
          name: requiredString(component, 'name'),
          qualifier: requiredString(component, 'qualifier'),
          description: optionalString(component, 'description'),
          language: optionalString(component, 'language'),
          path: optionalString(component, 'path')
        },
        measures,
        metrics
      },
      message: `Retrieved **${measures.length}** measures for SonarQube project **${projectKey}**.`
    };
  })
  .build();
