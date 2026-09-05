import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  createAmplitudeDeveloperClient,
  developerListSchema,
  developerResultSchema
} from '../lib/developer-client';
import { validateDateRange } from '../lib/rest-validation';
import { spec } from '../spec';

const projectId = z
  .string()
  .regex(/^\d+$/)
  .describe('Project ID. Call get_amplitude_context to discover accessible projects.');
const pagination = {
  cursor: z
    .string()
    .optional()
    .describe('Opaque pagination.next_cursor from the previous response.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe('Page size, up to 200; defaults to 50.')
};
const query = z.string().optional().describe('Full-text search query; omit to browse.');
const sort = z
  .enum(['updated_at', '-updated_at', 'name', '-name'])
  .optional()
  .describe('Sort field, with a minus prefix for descending order.');
const chartType = z.enum([
  'event_segmentation',
  'sessions',
  'funnels',
  'retention',
  'composition',
  'revenue_ltv',
  'stickiness',
  'data_table',
  'engagement_matrix',
  'metric_explorer',
  'growth_accounting',
  'impact',
  'users',
  'unknown'
]);
const invalid = (message: string): never => {
  throw createApiServiceError(message, { reason: 'amplitude_invalid_input' });
};

export const getAmplitudeContextRestTool = SlateTool.create(spec, {
  key: 'get_amplitude_context',
  name: 'Get Amplitude Context',
  description:
    'Discover your authenticated user, organization, and accessible projects using Amplitude OAuth. Projects are paginated; reuse the returned pagination cursor. Project API-key REST tools already identify their project and do not require this discovery step.',
  tags: { readOnly: true, destructive: false }
})
  .authMethods(['oauth'])
  .input(z.object({ ...pagination, q: query, sort }))
  .output(
    z.object({
      context: z.record(z.string(), z.unknown()),
      projects: developerListSchema
    })
  )
  .handleInvocation(async ctx => {
    const client = createAmplitudeDeveloperClient(ctx);
    const [context, projects] = await Promise.all([
      client.getContext(),
      client.listProjects(ctx.input)
    ]);
    return {
      output: { context: context.data, projects },
      message: 'Retrieved Amplitude user, organization, and accessible projects.'
    };
  })
  .build();

export const getAmplitudeChartsRestTool = SlateTool.create(spec, {
  key: 'get_amplitude_charts',
  name: 'Get Amplitude Charts',
  description:
    'List or search saved charts in an OAuth-accessible project, or retrieve one chart by ID. Call get_amplitude_context for projects. A chart read can include its read-only raw definition; definitions are not an authoring API. For chart results use query_amplitude_data. Search pages stop at 10,000 matches, so narrow large lists by name or type.',
  tags: { readOnly: true, destructive: false }
})
  .authMethods(['oauth'])
  .input(
    z.object({
      projectId,
      chartId: z.string().min(1).optional().describe('Saved chart ID. Omit to list charts.'),
      includeDefinition: z
        .boolean()
        .optional()
        .describe('For chartId reads only: include the read-only raw definition.'),
      q: query,
      chartType: chartType.optional(),
      sort,
      ...pagination
    })
  )
  .output(z.object({ result: z.union([developerListSchema, developerResultSchema]) }))
  .handleInvocation(async ctx => {
    const { projectId, chartId, includeDefinition, chartType, ...page } = ctx.input;
    const client = createAmplitudeDeveloperClient(ctx);
    if (chartId && Object.values(page).some(value => value !== undefined))
      invalid('List search, sort, and pagination options cannot be combined with chartId.');
    if (chartId && chartType !== undefined) invalid('chartType is only for listing charts.');
    if (!chartId && includeDefinition !== undefined)
      invalid('includeDefinition requires chartId.');
    const result = chartId
      ? await client.getChart(projectId, chartId, includeDefinition)
      : await client.listCharts(projectId, { ...page, chart_type: chartType });
    return {
      output: { result },
      message: chartId
        ? 'Retrieved saved Amplitude chart.'
        : 'Retrieved saved Amplitude charts.'
    };
  })
  .build();

export const queryAmplitudeDataRestTool = SlateTool.create(spec, {
  key: 'query_amplitude_data',
  name: 'Query Amplitude Data',
  description:
    'Compute analytics results for an existing saved chart using Amplitude OAuth. Discover project and chart IDs with get_amplitude_context and get_amplitude_charts. Supports event segmentation, sessions, funnels, and retention, with optional result-size overrides. Documented date overrides currently fail upstream for a tested saved segmentation chart; see timeRange. This read-only query does not create chart edits or save changes; it does not accept arbitrary new chart definitions.',
  tags: { readOnly: true, destructive: false }
})
  .authMethods(['oauth'])
  .input(
    z.object({
      projectId,
      chartId: z.string().min(1).describe('Saved chart ID from get_amplitude_charts.'),
      timeRange: z
        .object({
          start: z.string().describe('Inclusive YYYY-MM-DD start.'),
          end: z.string().describe('Inclusive YYYY-MM-DD end.')
        })
        .optional()
        .describe(
          'Optional documented date override. Amplitude currently returns HTTP 502 wrapping a 400 for this override on a tested saved segmentation chart. Omission uses the saved chart range. If requested dates fail, report the provider error and ask before changing or omitting them.'
        ),
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone; defaults to the project timezone.'),
      excludeIncompleteDatapoints: z.boolean().optional(),
      groupByLimit: z.number().int().min(1).max(1000).optional(),
      timeSeriesLimit: z
        .number()
        .int()
        .min(0)
        .max(1000)
        .optional()
        .describe('Maximum time buckets per series. Zero returns a scalar aggregate.')
    })
  )
  .output(developerResultSchema)
  .handleInvocation(async ctx => {
    const {
      projectId,
      chartId,
      timeRange,
      timezone,
      excludeIncompleteDatapoints,
      groupByLimit,
      timeSeriesLimit
    } = ctx.input;
    if (timeRange) validateDateRange(timeRange.start, timeRange.end, 'iso-day');
    const result = await createAmplitudeDeveloperClient(ctx).queryChart(projectId, chartId, {
      time_range: timeRange,
      timezone,
      exclude_incomplete_datapoints: excludeIncompleteDatapoints,
      group_by_limit: groupByLimit,
      time_series_limit: timeSeriesLimit
    });
    return { output: result, message: 'Queried saved Amplitude chart.' };
  })
  .build();

export const manageAmpEventsRestTool = SlateTool.create(spec, {
  key: 'manage_amp_events',
  name: 'Read Amplitude Events',
  description:
    'Read or search event definitions in an OAuth-accessible project tracking plan. This tool only reads raw events; it never creates, changes, deletes, or ingests events. Call get_amplitude_context to discover projects. The event ID is its exact event_type name.',
  tags: { readOnly: true, destructive: false }
})
  .authMethods(['oauth'])
  .input(
    z
      .object({
        action: z.literal('get').optional().describe('Only read operations are supported.'),
        projectId,
        eventType: z
          .string()
          .min(1)
          .optional()
          .describe('Exact event_type name to read. Omit to list/search.'),
        q: query,
        ...pagination
      })
      .strict()
  )
  .output(z.object({ result: z.union([developerListSchema, developerResultSchema]) }))
  .handleInvocation(async ctx => {
    const { projectId, eventType, action, ...page } = ctx.input;
    if (action !== undefined && action !== 'get') invalid('Only event reads are supported.');
    if (eventType && Object.values(page).some(value => value !== undefined))
      invalid('Search and pagination options cannot be combined with eventType.');
    const client = createAmplitudeDeveloperClient(ctx);
    const result = eventType
      ? await client.getEvent(projectId, eventType)
      : await client.listEvents(projectId, page);
    return { output: { result }, message: 'Retrieved Amplitude event definitions.' };
  })
  .build();

export const getPropertiesRestTool = SlateTool.create(spec, {
  key: 'get_properties',
  name: 'Get Amplitude Properties',
  description:
    'List or search event or user properties using Amplitude OAuth. Discover project IDs with get_amplitude_context. Event properties require an exact eventType from manage_amp_events; user properties are project-wide. Returns tracking-plan metadata and pagination.',
  tags: { readOnly: true, destructive: false }
})
  .authMethods(['oauth'])
  .input(
    z.object({
      projectId,
      propertyType: z.enum(['event', 'user']),
      eventType: z.string().min(1).optional(),
      q: query,
      ...pagination
    })
  )
  .output(developerListSchema)
  .handleInvocation(async ctx => {
    const { projectId, propertyType, eventType, ...page } = ctx.input;
    if (propertyType === 'event' && !eventType)
      invalid('Event properties require eventType from manage_amp_events.');
    if (propertyType === 'user' && eventType !== undefined)
      invalid('User properties do not accept eventType.');
    const client = createAmplitudeDeveloperClient(ctx);
    const result =
      propertyType === 'event' && eventType
        ? await client.listEventProperties(projectId, eventType, page)
        : await client.listUserProperties(projectId, page);
    return { output: result, message: 'Retrieved Amplitude properties.' };
  })
  .build();

export const getFlagsRestTool = SlateTool.create(spec, {
  key: 'get_flags',
  name: 'Get Amplitude Flags',
  description:
    'List feature flags in an OAuth-accessible project, or read a flag by ID. Discover project IDs with get_amplitude_context. This reads flag configuration, not experiment statistical results.',
  tags: { readOnly: true, destructive: false }
})
  .authMethods(['oauth'])
  .input(
    z.object({
      projectId,
      flagId: z
        .string()
        .min(1)
        .optional()
        .describe('Flag ID from a previous list. Omit to list flags.'),
      ...pagination
    })
  )
  .output(z.object({ result: z.union([developerListSchema, developerResultSchema]) }))
  .handleInvocation(async ctx => {
    const { projectId, flagId, ...page } = ctx.input;
    if (flagId && Object.values(page).some(value => value !== undefined))
      invalid('Pagination options cannot be combined with flagId.');
    const client = createAmplitudeDeveloperClient(ctx);
    const result = flagId
      ? await client.getFlag(projectId, flagId)
      : await client.listFlags(projectId, page);
    return { output: { result }, message: 'Retrieved Amplitude feature flags.' };
  })
  .build();

export const searchAmplitudeRestTool = SlateTool.create(spec, {
  key: 'search',
  name: 'Search Amplitude',
  description:
    'Search saved charts, raw event definitions, event properties, or user properties in one Amplitude project through OAuth. Call get_amplitude_context for project IDs. Choose one supported resource surface per call and follow its pagination cursor. This API does not search dashboards, notebooks, experiments, or documentation.',
  tags: { readOnly: true, destructive: false }
})
  .authMethods(['oauth'])
  .input(
    z.object({
      projectId,
      resource: z.enum(['charts', 'events', 'event_properties', 'user_properties']),
      q: z.string().min(1).describe('Full-text query.'),
      eventType: z
        .string()
        .min(1)
        .optional()
        .describe('Required only for event_properties; exact name from manage_amp_events.'),
      ...pagination
    })
  )
  .output(developerListSchema)
  .handleInvocation(async ctx => {
    const { projectId, resource, eventType, ...page } = ctx.input;
    if (resource === 'event_properties' && !eventType)
      invalid('event_properties search requires eventType.');
    if (resource !== 'event_properties' && eventType !== undefined)
      invalid('eventType applies only to event_properties search.');
    const client = createAmplitudeDeveloperClient(ctx);
    const result =
      resource === 'charts'
        ? await client.listCharts(projectId, page)
        : resource === 'events'
          ? await client.listEvents(projectId, page)
          : resource === 'event_properties' && eventType
            ? await client.listEventProperties(projectId, eventType, page)
            : await client.listUserProperties(projectId, page);
    return { output: result, message: 'Searched Amplitude project resources.' };
  })
  .build();

export const amplitudeDeveloperTools = [
  getAmplitudeContextRestTool,
  getAmplitudeChartsRestTool,
  queryAmplitudeDataRestTool,
  manageAmpEventsRestTool,
  getPropertiesRestTool,
  getFlagsRestTool,
  searchAmplitudeRestTool
];
