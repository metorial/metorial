import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import {
  analyticsChartIdSchema,
  analyticsProjectIdSchema,
  analyticsQueryFields,
  analyticsQueryOptions,
  evaluateChartThreshold,
  parseAnalyticsResult,
  type ReportChart,
  renderAnalyticsReport,
  reportSourceSchema,
  thresholdOperatorSchema,
  thresholdOutputSchema
} from '../lib/analytics-reports';
import { createAmplitudeDeveloperClient } from '../lib/developer-client';
import { spec } from '../spec';

const reportInputSchema = z.object({
  projectId: analyticsProjectIdSchema,
  title: z.string().min(1).max(200).describe('Plain-text report title.'),
  introduction: z.string().max(10000).optional().describe('Plain-text opening narrative.'),
  charts: z
    .array(
      z.object({
        chartId: analyticsChartIdSchema,
        heading: z
          .string()
          .min(1)
          .max(200)
          .optional()
          .describe('Optional plain-text section heading.'),
        notes: z.string().max(10000).optional().describe('Plain-text notes beside this chart.')
      })
    )
    .min(1)
    .max(10)
    .describe('One to ten saved charts, in report order.'),
  ...analyticsQueryFields
});
const reportOutputSchema = z.object({
  fileName: z.string(),
  contentType: z.literal('text/html'),
  byteLength: z.number().int(),
  sources: z.array(reportSourceSchema)
});

const createReportTool = (kind: 'dashboard' | 'notebook') =>
  SlateTool.create(spec, {
    key: kind === 'dashboard' ? 'create_dashboard_report' : 'create_notebook_report',
    name: kind === 'dashboard' ? 'Create Dashboard Report' : 'Create Notebook Report',
    description: `Create a downloadable HTML ${kind === 'dashboard' ? 'dashboard with chart cards' : 'notebook with ordered narrative sections'} from 1–10 saved Amplitude charts using OAuth. Discover projects with get_amplitude_context and charts with get_amplitude_charts. Queries event segmentation, sessions, funnels, and retention results; preserves source links, provider values, metric semantics, and incomplete/truncated result warnings. Plain text is escaped. Files are limited to 4 MiB. This read-only export does not create or edit a native Amplitude ${kind}.`,
    tags: { readOnly: true, destructive: false }
  })
    .authMethods(['oauth'])
    .input(reportInputSchema)
    .output(reportOutputSchema)
    .handleInvocation(async ctx => {
      const client = createAmplitudeDeveloperClient(ctx);
      const requestedQuery = analyticsQueryOptions(ctx.input);
      const charts: ReportChart[] = [];
      for (const chart of ctx.input.charts) {
        const [metadata, queried] = await Promise.all([
          client.getChart(ctx.input.projectId, chart.chartId),
          client.queryChart(ctx.input.projectId, chart.chartId, requestedQuery)
        ]);
        charts.push({
          heading: chart.heading,
          notes: chart.notes,
          metadata: metadata.data,
          result: parseAnalyticsResult(queried.data, ctx.input.projectId, chart.chartId)
        });
      }
      const { content, ...output } = renderAnalyticsReport({
        kind,
        title: ctx.input.title,
        introduction: ctx.input.introduction,
        charts,
        requestedQuery
      });
      const incomplete = output.sources.some(source =>
        ['partial', 'unsupported', 'unknown'].includes(source.status)
      );
      return {
        output,
        attachments: [createTextAttachment(content, output.contentType)],
        message: incomplete
          ? `Created a downloadable ${kind} report. Some sources are partial, unsupported, or of unknown completeness; review the report warnings.`
          : `Created a downloadable ${kind} report from ${charts.length} saved chart(s).`
      };
    })
    .build();

export const createDashboardReportTool = createReportTool('dashboard');
export const createNotebookReportTool = createReportTool('notebook');
export const checkChartThresholdTool = SlateTool.create(spec, {
  key: 'check_chart_threshold',
  name: 'Check Chart Threshold',
  description:
    'Run one saved Amplitude chart query with OAuth and compare one explicitly selected numeric point against a threshold. Always requests incomplete-point exclusion. Discover projects/charts with get_amplitude_context/get_amplitude_charts and select an exact series ID and zero-based point index from query_amplitude_data with excludeIncompleteDatapoints=true and matching query options. Uses the returned point without summing or deriving metrics. Empty/null/absent selections return no_data; truncated, incomplete, unsupported, or unconfirmed-completeness results return inconclusive with matched=null. This is an on-demand read, without scheduling or notifications.',
  tags: { readOnly: true, destructive: false }
})
  .authMethods(['oauth'])
  .input(
    z.object({
      projectId: analyticsProjectIdSchema,
      chartId: analyticsChartIdSchema,
      seriesId: z
        .string()
        .min(1)
        .max(500)
        .describe('Exact returned series.id from query_amplitude_data.'),
      pointIndex: z
        .number()
        .int()
        .min(0)
        .max(Number.MAX_SAFE_INTEGER)
        .describe(
          'Zero-based index in the series points array queried with excludeIncompleteDatapoints=true.'
        ),
      operator: thresholdOperatorSchema.describe(
        'gt (>), gte (>=), lt (<), lte (<=), eq (=), or ne (!=). Equality compares exact numeric values.'
      ),
      threshold: z
        .number()
        .finite()
        .describe('Finite numeric boundary in the selected point’s units.'),
      ...analyticsQueryFields
    })
  )
  .output(thresholdOutputSchema)
  .handleInvocation(async ctx => {
    const result = await createAmplitudeDeveloperClient(ctx).queryChart(
      ctx.input.projectId,
      ctx.input.chartId,
      {
        ...analyticsQueryOptions(ctx.input),
        exclude_incomplete_datapoints: true
      }
    );
    const output = evaluateChartThreshold(
      parseAnalyticsResult(result.data, ctx.input.projectId, ctx.input.chartId),
      ctx.input
    );
    return { output, message: output.reason };
  })
  .build();

export const amplitudeReportTools = [
  createDashboardReportTool,
  createNotebookReportTool,
  checkChartThresholdTool
];
