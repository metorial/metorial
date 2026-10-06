import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageIdSchema, paginationFields } from '../lib/validation';
import { spec } from '../spec';

const metricOutput = z.object({
  metricId: z.string(),
  name: z.string(),
  metricsProviderId: z.string().optional(),
  metricIdentifier: z.string().optional(),
  display: z.boolean().optional(),
  suffix: z.string().optional(),
  tooltipDescription: z.string().optional(),
  decimalPlaces: z.number().optional(),
  mostRecentDataAt: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});
export let manageMetric = SlateTool.create(spec, {
  key: 'manage_metric',
  name: 'Manage Metric',
  description:
    'Discover metric providers, list or inspect system metrics, and create, rename or delete a metric. A metric provider must already exist; list_providers discovers its ID. Creation can display a chart on the status page unless display=false. Use submit_metric_data to send custom data to a Self provider metric.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      pageId: pageIdSchema,
      ...paginationFields,
      action: z.enum(['list', 'get', 'create', 'update', 'delete', 'list_providers']),
      metricId: z.string().optional().describe('Metric ID for get, update or delete.'),
      metricsProviderId: z
        .string()
        .optional()
        .describe('Existing provider ID from list_providers, required for creation.'),
      name: z.string().optional().describe('Metric name; required for creation.'),
      metricIdentifier: z
        .string()
        .optional()
        .describe('Identifier used by the existing metrics provider.'),
      display: z
        .boolean()
        .optional()
        .describe('Show the new chart on the page. Applies only to create.'),
      suffix: z.string().optional().describe('Chart unit suffix. Applies only to create.'),
      tooltipDescription: z
        .string()
        .optional()
        .describe('Chart tooltip. Applies only to create.'),
      decimalPlaces: z
        .number()
        .optional()
        .describe('Decimal places shown on the new chart; nonnegative integer.')
    })
  )
  .output(
    z.object({
      metric: metricOutput.optional(),
      metrics: z.array(metricOutput).optional(),
      providers: z
        .array(
          z.object({
            metricsProviderId: z.string(),
            type: z.string(),
            disabled: z.boolean().optional()
          })
        )
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({
      token: ctx.auth.token,
      pageId: ctx.input.pageId ?? ctx.config.pageId
    });
    const map = (metric: Awaited<ReturnType<Client['getMetric']>>) => ({
      metricId: metric.id,
      name: metric.name,
      metricsProviderId: metric.metrics_provider_id,
      metricIdentifier: metric.metric_identifier,
      display: metric.display,
      suffix: metric.suffix,
      tooltipDescription: metric.tooltip_description,
      decimalPlaces: metric.decimal_places,
      mostRecentDataAt: metric.most_recent_data_at,
      createdAt: metric.created_at,
      updatedAt: metric.updated_at
    });
    if (ctx.input.action === 'list_providers')
      return {
        output: {
          providers: (await client.listMetricsProviders()).map(item => ({
            metricsProviderId: item.id,
            type: item.type,
            disabled: item.disabled
          }))
        },
        message: 'Retrieved existing metric providers.'
      };
    if (ctx.input.action === 'list')
      return {
        output: { metrics: (await client.listMetrics(ctx.input)).map(map) },
        message: 'Retrieved a page of system metrics.'
      };
    if (ctx.input.action !== 'create' && !ctx.input.metricId)
      throw createApiServiceError('metricId is required for get, update or delete.');
    if (ctx.input.action === 'delete' && ctx.input.metricId) {
      await client.deleteMetric(ctx.input.metricId);
      return { output: { deleted: true }, message: `Deleted metric ${ctx.input.metricId}.` };
    }
    if (ctx.input.action === 'get' && ctx.input.metricId)
      return {
        output: { metric: map(await client.getMetric(ctx.input.metricId)) },
        message: 'Retrieved the metric.'
      };
    if (ctx.input.action === 'update' && ctx.input.metricId) {
      if (
        [
          ctx.input.display,
          ctx.input.suffix,
          ctx.input.tooltipDescription,
          ctx.input.decimalPlaces,
          ctx.input.metricsProviderId
        ].some(value => value !== undefined)
      )
        throw createApiServiceError(
          'The documented metric update supports only name and metricIdentifier.'
        );
      return {
        output: {
          metric: map(
            await client.updateMetric(
              ctx.input.metricId,
              pickDefined({
                name: ctx.input.name,
                metric_identifier: ctx.input.metricIdentifier
              })
            )
          )
        },
        message: 'Updated the metric.'
      };
    }
    if (!ctx.input.name?.trim() || !ctx.input.metricsProviderId || ctx.input.metricId)
      throw createApiServiceError(
        'Creation requires name and metricsProviderId without metricId.'
      );
    if (
      ctx.input.decimalPlaces !== undefined &&
      (!Number.isInteger(ctx.input.decimalPlaces) || ctx.input.decimalPlaces < 0)
    )
      throw createApiServiceError('decimalPlaces must be a nonnegative integer.');
    const metric = await client.createMetric(
      ctx.input.metricsProviderId,
      pickDefined({
        name: ctx.input.name,
        metric_identifier: ctx.input.metricIdentifier,
        display: ctx.input.display,
        suffix: ctx.input.suffix,
        tooltip_description: ctx.input.tooltipDescription,
        decimal_places: ctx.input.decimalPlaces
      })
    );
    return { output: { metric: map(metric) }, message: 'Created the system metric.' };
  })
  .build();
