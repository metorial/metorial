import { createApiServiceError } from 'slates';
import { z } from 'zod';
import type { DeveloperChartQuery } from './developer-client';
import { parseResponse, recordSchema, validateDateRange } from './rest-validation';

export const analyticsProjectIdSchema = z
  .string()
  .regex(/^\d+$/)
  .max(64)
  .describe('Project ID. Call get_amplitude_context to discover accessible projects.');
export const analyticsChartIdSchema = z
  .string()
  .min(1)
  .max(200)
  .describe('Saved chart ID from get_amplitude_charts.');
export const analyticsQueryFields = {
  timeRange: z
    .object({
      start: z.string().describe('Inclusive YYYY-MM-DD start date.'),
      end: z.string().describe('Inclusive YYYY-MM-DD end date.')
    })
    .optional()
    .describe(
      'Optional documented date override. Omit to use the saved range. Amplitude rejects this override for some saved charts; an error is returned without changing the requested dates.'
    ),
  timezone: z.string().min(1).max(100).optional().describe('IANA computation timezone.'),
  groupByLimit: z.number().int().min(1).max(1000).optional(),
  timeSeriesLimit: z
    .number()
    .int()
    .min(0)
    .max(1000)
    .optional()
    .describe(
      'Maximum time buckets per series. Zero requests a provider-computed scalar aggregate; a threshold check still requires a returned numeric point.'
    )
};

const queryOptionsSchema = z.object(analyticsQueryFields);
export const analyticsQueryOptions = (
  input: z.infer<typeof queryOptionsSchema>
): DeveloperChartQuery => {
  if (input.timeRange)
    validateDateRange(input.timeRange.start, input.timeRange.end, 'iso-day');
  return {
    time_range: input.timeRange,
    timezone: input.timezone,
    group_by_limit: input.groupByLimit,
    time_series_limit: input.timeSeriesLimit
  };
};

const pointSchema = z
  .object({
    x: z.union([z.string(), z.number().finite()]),
    y: z.number().finite().nullable(),
    complete: z.boolean().optional()
  })
  .passthrough();
const seriesSchema = z
  .object({
    id: z.string().min(1),
    label: z.string(),
    points: z.array(pointSchema),
    aggregate: z
      .object({ value: z.number().finite().nullable(), method: z.string() })
      .passthrough()
      .optional()
  })
  .passthrough();
const metricSemanticsSchema = z
  .object({
    additive: z.boolean(),
    recommended_aggregate: z.string(),
    notes: z.string().nullable().optional()
  })
  .passthrough();
const truncationSchema = z
  .object({
    group_by_limit: z.number().int().optional(),
    time_series_limit: z.number().int().optional(),
    reason: z.string().optional()
  })
  .passthrough();
const analyticsResultSchema = z.object({
  id: z.string().min(1),
  object: z.literal('analytics_result'),
  source_type: z.literal('chart'),
  source_id: z.string().min(1),
  project_id: z.string().min(1),
  computed_at: z.string().min(1),
  timezone: z.string().min(1),
  result_kind: z.string(),
  metric_semantics: metricSemanticsSchema,
  data: z
    .object({
      dimensions: z
        .array(z.object({ id: z.string(), label: z.string(), role: z.string() }).passthrough())
        .optional(),
      series: z.array(seriesSchema).optional(),
      columns: z.array(z.string()).optional(),
      rows: z
        .array(z.array(z.union([z.string(), z.number().finite(), z.boolean(), z.null()])))
        .optional()
    })
    .passthrough(),
  metadata: z.object({ exclude_incomplete_datapoints: z.boolean().optional() }).passthrough(),
  warnings: z.array(z.string()),
  truncated: truncationSchema.nullable().optional()
});
type AnalyticsResult = z.infer<typeof analyticsResultSchema>;
const sourceMetadataSchema = z.object({
  id: z.string(),
  object: z.literal('chart'),
  project_id: z.string(),
  name: z.string(),
  url: z.string()
});

export const parseAnalyticsResult = (
  data: unknown,
  projectId: string,
  chartId: string
): AnalyticsResult => {
  const result = parseResponse(analyticsResultSchema, data, 'saved chart analytics');
  if (result.project_id !== projectId || result.source_id !== chartId)
    throw createApiServiceError(
      'Amplitude returned analytics for a different chart or project.',
      {
        reason: 'amplitude_invalid_response'
      }
    );
  const seriesIds = result.data.series?.map(series => series.id) ?? [];
  if (new Set(seriesIds).size !== seriesIds.length)
    throw createApiServiceError('Amplitude returned duplicate series identifiers.', {
      reason: 'amplitude_invalid_response'
    });
  if (
    result.data.columns &&
    result.data.rows?.some(row => row.length !== result.data.columns?.length)
  )
    throw createApiServiceError(
      'Amplitude returned chart rows that do not match the columns.',
      {
        reason: 'amplitude_invalid_response'
      }
    );
  return result;
};

const normalizedSeriesKinds = new Set(['timeseries', 'scalar', 'funnel', 'retention']);
const resultShape = (result: AnalyticsResult): 'series' | 'table' | 'unsupported' => {
  if (normalizedSeriesKinds.has(result.result_kind) && result.data.series) return 'series';
  if (
    (result.result_kind === 'table' || normalizedSeriesKinds.has(result.result_kind)) &&
    result.data.columns &&
    result.data.rows
  )
    return 'table';
  return 'unsupported';
};

const hasUnconfirmedPoints = (result: AnalyticsResult) =>
  result.metadata.exclude_incomplete_datapoints !== true &&
  result.data.series?.some(series =>
    series.points.some(point => point.complete === undefined)
  );

const resultWarnings = (result: AnalyticsResult) => {
  const warnings = [...result.warnings];
  if (result.truncated)
    warnings.push(
      `Truncated result: ${result.truncated.reason ?? 'Amplitude omitted some data.'}`
    );
  else if (result.truncated === undefined)
    warnings.push('Completeness is unknown: Amplitude did not return truncation metadata.');
  if (
    result.data.series?.some(series => series.points.some(point => point.complete === false))
  )
    warnings.push('The result includes incomplete points. Their values may change.');
  if (hasUnconfirmedPoints(result))
    warnings.push(
      'Point completeness is unknown: some points have no completeness flag, and Amplitude did not confirm incomplete-point exclusion. Current intervals may still be filling.'
    );
  if (
    !result.metric_semantics.additive ||
    result.metric_semantics.recommended_aggregate === 'unknown'
  )
    warnings.push(
      'Do not sum these values across time or groups without deduplication guidance.'
    );
  if (resultShape(result) === 'unsupported')
    warnings.push(
      `Unsupported result shape: ${result.result_kind}. No metric values were rendered.`
    );
  return warnings;
};

export const analyticsProvenanceSchema = z.object({
  projectId: z.string(),
  chartId: z.string(),
  queryId: z.string(),
  computedAt: z.string(),
  timezone: z.string(),
  resultKind: z.string(),
  metricSemantics: metricSemanticsSchema,
  effectiveQuery: recordSchema,
  truncationKnown: z.boolean(),
  truncated: truncationSchema.nullable()
});
const analyticsProvenance = (result: AnalyticsResult) => ({
  projectId: result.project_id,
  chartId: result.source_id,
  queryId: result.id,
  computedAt: result.computed_at,
  timezone: result.timezone,
  resultKind: result.result_kind,
  metricSemantics: result.metric_semantics,
  effectiveQuery: result.metadata,
  truncationKnown: result.truncated !== undefined,
  truncated: result.truncated ?? null
});

export const reportSourceSchema = analyticsProvenanceSchema.extend({
  chartName: z.string(),
  url: z.string(),
  seriesIds: z.array(z.string()),
  pointCount: z.number().int(),
  rowCount: z.number().int(),
  status: z.enum(['complete', 'partial', 'empty', 'unsupported', 'unknown']),
  warnings: z.array(z.string())
});
type ReportSource = z.infer<typeof reportSourceSchema>;
export type ReportChart = {
  heading?: string;
  notes?: string;
  metadata: unknown;
  result: AnalyticsResult;
};

const reportSource = (chart: ReportChart): ReportSource => {
  const { result } = chart;
  const metadata = parseResponse(sourceMetadataSchema, chart.metadata, 'saved chart metadata');
  let sourceUrl: URL;
  try {
    sourceUrl = new URL(metadata.url);
  } catch {
    throw createApiServiceError('Amplitude returned an invalid chart source URL.', {
      reason: 'amplitude_invalid_response'
    });
  }
  if (
    metadata.id !== result.source_id ||
    metadata.project_id !== result.project_id ||
    sourceUrl.protocol !== 'https:' ||
    (sourceUrl.hostname !== 'amplitude.com' &&
      !sourceUrl.hostname.endsWith('.amplitude.com')) ||
    sourceUrl.username ||
    sourceUrl.password ||
    sourceUrl.port
  )
    throw createApiServiceError(
      'Amplitude returned inconsistent chart metadata or an unsafe source URL.',
      {
        reason: 'amplitude_invalid_response'
      }
    );
  const pointCount =
    result.data.series?.reduce((count, series) => count + series.points.length, 0) ?? 0;
  const rowCount = result.data.rows?.length ?? 0;
  const hasAggregate = result.data.series?.some(series => series.aggregate?.value != null);
  const hasIncompletePoint = result.data.series?.some(series =>
    series.points.some(point => point.complete === false)
  );
  const status =
    resultShape(result) === 'unsupported'
      ? 'unsupported'
      : result.truncated || hasIncompletePoint
        ? 'partial'
        : result.truncated === undefined || hasUnconfirmedPoints(result)
          ? 'unknown'
          : !pointCount && !rowCount && !hasAggregate
            ? 'empty'
            : 'complete';
  return {
    ...analyticsProvenance(result),
    chartName: metadata.name,
    url: sourceUrl.href,
    seriesIds: result.data.series?.map(series => series.id) ?? [],
    pointCount,
    rowCount,
    status,
    warnings: resultWarnings(result)
  };
};

const maxReportBytes = 4 * 1024 * 1024;
// Provider and user text is inserted only into HTML text or quoted attributes.
const htmlText = (value: string) =>
  value.replace(/[&<>"']/g, character => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
const displayValue = (value: string | number | boolean | null) =>
  value === null ? 'No data (null)' : htmlText(String(value));

export const renderAnalyticsReport = (input: {
  kind: 'dashboard' | 'notebook';
  title: string;
  introduction?: string;
  charts: ReportChart[];
  requestedQuery: DeveloperChartQuery;
}) => {
  const sourcedCharts = input.charts.map(chart => ({ chart, source: reportSource(chart) }));
  const sources = sourcedCharts.map(({ source }) => source);
  const fragments: string[] = [];
  let byteLength = 0;
  const append = (html: string) => {
    byteLength += Buffer.byteLength(html, 'utf8');
    if (byteLength > maxReportBytes)
      throw createApiServiceError(
        'The report exceeds the 4 MiB file limit. Request fewer charts or lower groupByLimit/timeSeriesLimit and retry; provider truncation will be labeled in the report.',
        { reason: 'amplitude_report_size_limit' }
      );
    fragments.push(html);
  };
  const jsonBlock = (label: string, value: unknown) =>
    append(
      `<details><summary>${htmlText(label)}</summary><pre>${htmlText(JSON.stringify(value, null, 2))}</pre></details>`
    );
  append(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${htmlText(input.title)}</title><style>body{font:16px/1.5 system-ui,sans-serif;color:#202533;background:#f5f6f9;margin:0;padding:32px}header,main,footer{max-width:1280px;margin:auto}h1{margin-bottom:8px}h2{margin-top:0}h3{font-size:1rem}a{color:#2258b8}main.dashboard{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr));gap:24px}main.notebook{max-width:900px}article{background:white;border:1px solid #d7dce5;border-radius:12px;padding:24px;margin:24px 0;min-width:0}.dashboard article{margin:0}.narrative{white-space:pre-wrap}.scroll{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px}th,td{border:1px solid #d7dce5;padding:8px;text-align:left;overflow-wrap:anywhere}th{background:#f0f3f8}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f6f9;padding:12px}summary{cursor:pointer}.warning{background:#fff3d6;padding:12px}.muted{color:#596579}header{margin-bottom:24px}footer{margin-top:24px}@media print{body{padding:0;background:white}main.dashboard{display:block}article{break-inside:avoid}}</style></head><body><header><h1>${htmlText(input.title)}</h1><p class="muted">Downloadable ${input.kind} report from saved Amplitude charts. Provider values are shown as returned; no totals are calculated here.</p>`
  );
  if (input.introduction) append(`<p class="narrative">${htmlText(input.introduction)}</p>`);
  jsonBlock('Requested query overrides', input.requestedQuery);
  append(`</header><main class="${input.kind}">`);
  for (const { chart, source } of sourcedCharts) {
    const { result } = chart;
    append(
      `<article><h2>${htmlText(chart.heading ?? source.chartName)}</h2><p><a href="${htmlText(source.url)}" target="_blank" rel="noopener noreferrer">Open source chart</a> · Chart ID: ${htmlText(source.chartId)}</p>`
    );
    if (chart.notes) append(`<p class="narrative">${htmlText(chart.notes)}</p>`);
    append(
      `<p>Result status: <strong>${source.status}</strong>. Result kind: ${htmlText(source.resultKind)}. Computed at (provider): ${htmlText(source.computedAt)}. Timezone: ${htmlText(source.timezone)}.</p>`
    );
    if (source.status === 'empty')
      append('<p>No data returned. Empty data is not a zero measurement.</p>');
    if (source.warnings.length) {
      append('<aside class="warning"><strong>Warnings and limitations</strong><ul>');
      for (const warning of source.warnings) append(`<li>${htmlText(warning)}</li>`);
      append('</ul></aside>');
    }
    jsonBlock('Metric semantics', source.metricSemantics);
    jsonBlock('Effective query metadata (provider)', source.effectiveQuery);
    jsonBlock('Query provenance and truncation', {
      projectId: source.projectId,
      chartId: source.chartId,
      queryId: source.queryId,
      truncationKnown: source.truncationKnown,
      truncated: source.truncated
    });
    if (result.data.dimensions) jsonBlock('Dimensions', result.data.dimensions);
    if (resultShape(result) === 'series') {
      for (const series of result.data.series ?? []) {
        append(`<h3>${htmlText(series.label)} — Series ID: ${htmlText(series.id)}</h3>`);
        if (series.aggregate) jsonBlock('Provider-computed aggregate', series.aggregate);
        if (!series.points.length) append('<p>No points returned for this series.</p>');
        else {
          append(
            '<div class="scroll"><table><thead><tr><th scope="col">Point index</th><th scope="col">Dimension (x)</th><th scope="col">Value (y)</th><th scope="col">Point completeness</th></tr></thead><tbody>'
          );
          for (const [pointIndex, point] of series.points.entries())
            append(
              `<tr><td>${pointIndex}</td><td>${displayValue(point.x)}</td><td>${displayValue(point.y)}</td><td>${point.complete === false ? 'Incomplete' : point.complete === true ? 'Complete' : result.metadata.exclude_incomplete_datapoints === true ? 'Incomplete points excluded by provider' : 'Completeness unknown'}</td></tr>`
            );
          append('</tbody></table></div>');
        }
      }
    } else if (resultShape(result) === 'table') {
      append('<div class="scroll"><table><thead><tr>');
      for (const column of result.data.columns ?? [])
        append(`<th scope="col">${htmlText(column)}</th>`);
      append('</tr></thead><tbody>');
      for (const row of result.data.rows ?? []) {
        append('<tr>');
        for (const value of row) append(`<td>${displayValue(value)}</td>`);
        append('</tr>');
      }
      append('</tbody></table></div>');
    }
    append('</article>');
  }
  append(
    '</main><footer class="muted">Each source was queried separately. These results may have different computation times. Saved chart settings apply where no override was requested. A partial, unknown, or unsupported source is not a complete result.</footer></body></html>'
  );
  return {
    content: fragments.join(''),
    byteLength,
    sources,
    fileName: `amplitude-${input.kind}-report.html`,
    contentType: 'text/html' as const
  };
};

export const thresholdOperatorSchema = z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'ne']);
export const thresholdOutputSchema = z.object({
  status: z.enum(['evaluated', 'no_data', 'inconclusive']),
  matched: z.boolean().nullable(),
  value: z.number().finite().nullable(),
  operator: thresholdOperatorSchema,
  threshold: z.number().finite(),
  selection: z.object({
    seriesId: z.string(),
    seriesLabel: z.string().nullable(),
    pointIndex: z.number().int(),
    point: pointSchema.nullable(),
    availableSeriesIds: z.array(z.string())
  }),
  provenance: analyticsProvenanceSchema,
  warnings: z.array(z.string()),
  reason: z.string()
});
export const evaluateChartThreshold = (
  result: AnalyticsResult,
  selection: {
    seriesId: string;
    pointIndex: number;
    operator: z.infer<typeof thresholdOperatorSchema>;
    threshold: number;
  }
): z.infer<typeof thresholdOutputSchema> => {
  const series = result.data.series?.find(item => item.id === selection.seriesId);
  const point = series?.points[selection.pointIndex];
  const base = {
    operator: selection.operator,
    threshold: selection.threshold,
    selection: {
      seriesId: selection.seriesId,
      seriesLabel: series?.label ?? null,
      pointIndex: selection.pointIndex,
      point: point ?? null,
      availableSeriesIds: result.data.series?.map(item => item.id) ?? []
    },
    provenance: analyticsProvenance(result),
    warnings: resultWarnings(result)
  };
  const inconclusive = (reason: string): z.infer<typeof thresholdOutputSchema> => ({
    ...base,
    status: 'inconclusive',
    matched: null,
    value: point?.y ?? null,
    reason
  });
  if (resultShape(result) !== 'series')
    return inconclusive(
      'This result does not provide a supported series-and-point selection.'
    );
  if (result.truncated)
    return inconclusive('Amplitude truncated the result; the check is inconclusive.');
  if (result.truncated === undefined)
    return inconclusive(
      'Amplitude omitted truncation metadata; result completeness is unknown.'
    );
  if (!series || !point || point.y === null)
    return {
      ...base,
      status: 'no_data',
      matched: null,
      value: null,
      reason: !series
        ? 'The selected series ID was not returned. Use availableSeriesIds or query_amplitude_data to choose a returned series.'
        : !point
          ? 'The selected point index was not returned for this series.'
          : 'The selected point contains null, which is not a zero measurement.'
    };
  if (point.complete === false)
    return inconclusive('The selected point is flagged incomplete by Amplitude.');
  if (point.complete !== true && result.metadata.exclude_incomplete_datapoints !== true)
    return inconclusive(
      'Amplitude did not confirm that the selected point is complete or that incomplete points were excluded.'
    );
  let matched: boolean;
  switch (selection.operator) {
    case 'gt':
      matched = point.y > selection.threshold;
      break;
    case 'gte':
      matched = point.y >= selection.threshold;
      break;
    case 'lt':
      matched = point.y < selection.threshold;
      break;
    case 'lte':
      matched = point.y <= selection.threshold;
      break;
    case 'eq':
      matched = point.y === selection.threshold;
      break;
    case 'ne':
      matched = point.y !== selection.threshold;
      break;
  }
  return {
    ...base,
    status: 'evaluated',
    matched,
    value: point.y,
    reason:
      'Compared the selected numeric point exactly as returned, without aggregation. This is a one-time check.'
  };
};
