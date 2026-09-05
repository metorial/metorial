import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createAmplitudeClient } from '../lib/client';
import {
  createAmplitudeDeveloperClient,
  developerListSchema,
  developerObjectSchema,
  developerResultSchema
} from '../lib/developer-client';
import {
  developerDiscoveryCursor,
  discoveryBinding,
  discoveryItems,
  discoveryObject,
  filteredDeveloperPage,
  localDiscoveryPage,
  managementDiscoveryCursor,
  managementDiscoveryPage,
  rejectKeyProject,
  requireDiscoveryProject,
  singleDiscoveryList
} from '../lib/discovery';
import { createAmplitudeExperimentClient } from '../lib/experiment-client';
import { parseResponse, recordSchema, validateDateRange } from '../lib/rest-validation';
import { spec } from '../spec';

const projectId = z
  .string()
  .regex(/^\d+$/)
  .describe('Project ID. Call get_amplitude_context to discover accessible projects.');
const discoveryProjectId = projectId
  .optional()
  .describe(
    'Required with OAuth; call get_amplitude_context to discover projects. Omit for project API-key taxonomy or cohort reads. For management-key flag and experiment lists, optionally filters by project.'
  );
const groupType = z
  .string()
  .min(1)
  .optional()
  .describe(
    'For group properties with project API keys only: exact group type. Omit for shared group properties.'
  );
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
    'Discover your authenticated user, organization, and accessible projects using Amplitude OAuth. Projects are paginated; reuse the returned pagination cursor. Optional projectId also returns matching accessible project metadata, scanning up to 50 project pages independently of list search filters. Project API-key REST tools already identify their project and do not require this discovery step.',
  tags: { readOnly: true, destructive: false }
})
  .authMethods(['oauth'])
  .input(z.object({ ...pagination, q: query, sort, projectId: projectId.optional() }))
  .output(
    z.object({
      context: z.record(z.string(), z.unknown()),
      projects: developerListSchema,
      project: developerObjectSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = createAmplitudeDeveloperClient(ctx);
    const { projectId, ...page } = ctx.input;
    const [context, projects] = await Promise.all([
      client.getContext(),
      client.listProjects(page)
    ]);
    const project = projectId
      ? (projects.data.find(item => item.id === projectId) ??
        (await client.findProject(projectId)))
      : undefined;
    return {
      output: { context: context.data, projects, project },
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
    "Read or search raw event definitions using OAuth or project API keys. With OAuth, call get_amplitude_context for project IDs. Project keys read their connected project taxonomy and can add visible-event usage metadata, including this week's event totals. Taxonomy lists omit hidden and deleted events. Only reads are supported. The event ID is its exact event_type name.",
  tags: { readOnly: true, destructive: false }
})
  .authMethods(['oauth', 'api_key_secret'])
  .input(
    z
      .object({
        action: z.literal('get').optional().describe('Only read operations are supported.'),
        projectId: discoveryProjectId,
        eventType: z
          .string()
          .min(1)
          .optional()
          .describe('Exact event_type name to read. Omit to list/search.'),
        q: query,
        includeUsage: z
          .boolean()
          .optional()
          .describe(
            'Project API keys only: include usage metadata for visible events, including totals for this week. Missing usage does not mean zero events.'
          ),
        ...pagination
      })
      .strict()
  )
  .output(z.object({ result: z.union([developerListSchema, developerResultSchema]) }))
  .handleInvocation(async ctx => {
    const { projectId, eventType, action, includeUsage, ...page } = ctx.input;
    if (action !== undefined && action !== 'get') invalid('Only event reads are supported.');
    if (eventType && Object.values(page).some(value => value !== undefined))
      invalid('Search and pagination options cannot be combined with eventType.');
    if (!ctx.auth.apiKey) {
      if (includeUsage !== undefined)
        invalid('includeUsage requires project API-key credentials.');
      const client = createAmplitudeDeveloperClient(ctx);
      const project = requireDiscoveryProject(projectId);
      const result = eventType
        ? await client.getEvent(project, eventType)
        : await client.listEvents(project, page);
      return { output: { result }, message: 'Retrieved Amplitude event definitions.' };
    }
    rejectKeyProject(projectId);
    const client = createAmplitudeClient(ctx);
    const taxonomy = eventType
      ? await client.getEventType(eventType)
      : await client.getEventTypes();
    const items = eventType
      ? [
          discoveryObject(
            parseResponse(recordSchema, taxonomy, 'event lookup').data,
            'event',
            'event_type'
          )
        ]
      : discoveryItems(taxonomy).map(item => discoveryObject(item, 'event', 'event_type'));
    if (includeUsage) {
      const usage = new Map(
        discoveryItems(await client.getVisibleEventUsage()).map(item => {
          const normalized = discoveryObject(item, 'event_usage', 'value');
          return [normalized.id, item];
        })
      );
      for (const item of items) item.usage = usage.get(item.id) ?? null;
    }
    const result = eventType
      ? { data: parseResponse(developerObjectSchema, items[0], 'event lookup') }
      : localDiscoveryPage(
          items,
          page,
          discoveryBinding(ctx.auth, {
            tool: 'manage_amp_events',
            q: page.q,
            includeUsage: includeUsage ?? false
          })
        );
    return { output: { result }, message: 'Retrieved Amplitude event definitions.' };
  })
  .build();

export const getPropertiesRestTool = SlateTool.create(spec, {
  key: 'get_properties',
  name: 'Get Amplitude Properties',
  description:
    'List, search, or retrieve event and user property metadata with OAuth or project API keys. Group properties require project API keys; omit groupType for shared group properties. With OAuth, discover project IDs using get_amplitude_context. Event properties require an exact eventType from manage_amp_events. A name lookup returns one property in the same list-shaped output. Project-key complete lists are searched locally, with a 10,000-record cap and pagination.',
  tags: { readOnly: true, destructive: false }
})
  .authMethods(['oauth', 'api_key_secret'])
  .input(
    z.object({
      projectId: discoveryProjectId,
      propertyType: z.enum(['event', 'user', 'group']),
      eventType: z.string().min(1).optional(),
      groupType,
      name: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Exact property name from a previous list. Omit to list or search. Preserve provider prefixes such as gp: for custom user properties and grp: for custom group properties.'
        ),
      q: query,
      ...pagination
    })
  )
  .output(developerListSchema)
  .handleInvocation(async ctx => {
    const { projectId, propertyType, eventType, groupType, name, ...page } = ctx.input;
    if (propertyType === 'event' && !eventType)
      invalid('Event properties require eventType from manage_amp_events.');
    if (propertyType !== 'event' && eventType !== undefined)
      invalid('eventType applies only to event properties.');
    if (propertyType !== 'group' && groupType !== undefined)
      invalid('groupType applies only to group properties.');
    if (name && Object.values(page).some(value => value !== undefined))
      invalid('Search and pagination options cannot be combined with name.');
    if (!ctx.auth.apiKey) {
      if (propertyType === 'group')
        invalid('Group properties require project API-key credentials.');
      const project = requireDiscoveryProject(projectId);
      const client = createAmplitudeDeveloperClient(ctx);
      const response =
        propertyType === 'event' && eventType
          ? name
            ? await client.getEventProperty(project, eventType, name)
            : await client.listEventProperties(project, eventType, page)
          : name
            ? await client.getUserProperty(project, name)
            : await client.listUserProperties(project, page);
      const result = name
        ? singleDiscoveryList(
            parseResponse(developerObjectSchema, response.data, 'property lookup')
          )
        : parseResponse(developerListSchema, response, 'properties list');
      return { output: result, message: 'Retrieved Amplitude properties.' };
    }
    rejectKeyProject(projectId);
    const client = createAmplitudeClient(ctx);
    const response =
      propertyType === 'event' && eventType
        ? name
          ? await client.getEventProperty(name, eventType)
          : await client.getEventProperties(eventType)
        : propertyType === 'group'
          ? name
            ? await client.getGroupProperty(name, groupType)
            : await client.getGroupProperties(groupType)
          : name
            ? await client.getUserProperty(name)
            : await client.getUserProperties();
    const object = `${propertyType}_property`;
    const result = name
      ? singleDiscoveryList(
          discoveryObject(
            parseResponse(recordSchema, response, 'property lookup').data,
            object,
            object
          )
        )
      : localDiscoveryPage(
          discoveryItems(response).map(item => discoveryObject(item, object, object)),
          page,
          discoveryBinding(ctx.auth, {
            tool: 'get_properties',
            propertyType,
            eventType,
            groupType,
            q: page.q
          })
        );
    return { output: result, message: 'Retrieved Amplitude properties.' };
  })
  .build();

export const getFlagsRestTool = SlateTool.create(spec, {
  key: 'get_flags',
  name: 'Get Amplitude Flags',
  description:
    'List feature flags or read one by ID. OAuth requires a project ID from get_amplitude_context. API Key + Secret Key connections require an additional Experiment management API key; projectId is optional there and filters a list or verifies a single flag belongs to that project. Returns configuration, not experiment statistical results.',
  tags: { readOnly: true, destructive: false }
})
  .authMethods(['oauth', 'api_key_secret'])
  .input(
    z.object({
      projectId: discoveryProjectId,
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
    if (!ctx.auth.apiKey) {
      const project = requireDiscoveryProject(projectId);
      const client = createAmplitudeDeveloperClient(ctx);
      const result = flagId
        ? await client.getFlag(project, flagId)
        : await client.listFlags(project, page);
      return { output: { result }, message: 'Retrieved Amplitude feature flags.' };
    }
    const client = createAmplitudeExperimentClient(ctx);
    if (flagId) {
      const flag = discoveryObject(await client.getFlag(flagId), 'flag', 'id');
      if (projectId !== undefined) {
        const scoped = parseResponse(
          z.object({
            projectId: z.union([
              z.string().regex(/^\d+$/),
              z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
            ])
          }),
          flag,
          'flag project'
        );
        if (String(scoped.projectId) !== projectId)
          invalid('The requested flag does not belong to projectId.');
      }
      return {
        output: { result: { data: flag } },
        message: 'Retrieved Amplitude feature flag.'
      };
    }
    const binding = discoveryBinding(ctx.auth, { tool: 'get_flags', projectId });
    const response = await client.listFlags({
      projectId,
      limit: page.limit ?? 50,
      cursor: managementDiscoveryCursor(page.cursor, binding)
    });
    const result = managementDiscoveryPage(response, 'flags', page, binding);
    return { output: { result }, message: 'Retrieved Amplitude feature flags.' };
  })
  .build();

export const searchAmplitudeRestTool = SlateTool.create(spec, {
  key: 'search',
  name: 'Search Amplitude',
  description:
    'Search charts, raw events, event/user properties, or flags using OAuth and a project ID from get_amplitude_context. Project API keys support events, event/user/group properties, and cohorts; flags and experiments additionally require an Experiment management API key. Charts/events/properties use provider search with OAuth. Flags and experiments match names, IDs, keys, display names, or descriptions locally within one upstream page: continue even after an empty page when pagination.has_more is true. Project-key taxonomy/cohort complete lists use local matching with a 10,000-record cap. Does not search dashboards, notebooks, or documentation.',
  tags: { readOnly: true, destructive: false }
})
  .authMethods(['oauth', 'api_key_secret'])
  .input(
    z.object({
      projectId: discoveryProjectId,
      resource: z.enum([
        'charts',
        'events',
        'event_properties',
        'user_properties',
        'flags',
        'experiments',
        'cohorts',
        'group_properties'
      ]),
      q: z
        .string()
        .min(1)
        .describe(
          'Search text. Local matching is case-insensitive substring matching over resource identifiers, names, keys, and descriptions.'
        ),
      eventType: z
        .string()
        .min(1)
        .optional()
        .describe('Required only for event_properties; exact name from manage_amp_events.'),
      groupType,
      ...pagination
    })
  )
  .output(developerListSchema)
  .handleInvocation(async ctx => {
    const { projectId, resource, eventType, groupType, ...page } = ctx.input;
    if (resource === 'event_properties' && !eventType)
      invalid('event_properties search requires eventType.');
    if (resource !== 'event_properties' && eventType !== undefined)
      invalid('eventType applies only to event_properties search.');
    if (resource !== 'group_properties' && groupType !== undefined)
      invalid('groupType applies only to group_properties search.');
    const binding = discoveryBinding(ctx.auth, {
      tool: 'search',
      resource,
      projectId,
      eventType,
      groupType,
      q: page.q
    });
    if (!ctx.auth.apiKey) {
      if (
        resource === 'experiments' ||
        resource === 'cohorts' ||
        resource === 'group_properties'
      )
        invalid(
          `${resource} search requires an API Key + Secret Key connection${resource === 'experiments' ? ' with an Experiment management API key' : ''}.`
        );
      const project = requireDiscoveryProject(projectId);
      const client = createAmplitudeDeveloperClient(ctx);
      const result =
        resource === 'charts'
          ? await client.listCharts(project, page)
          : resource === 'events'
            ? await client.listEvents(project, page)
            : resource === 'event_properties' && eventType
              ? await client.listEventProperties(project, eventType, page)
              : resource === 'flags'
                ? filteredDeveloperPage(
                    await client.listFlags(project, {
                      limit: page.limit ?? 50,
                      cursor: developerDiscoveryCursor(page.cursor, binding)
                    }),
                    page,
                    binding
                  )
                : await client.listUserProperties(project, page);
      return {
        output: result,
        message: 'Searched Amplitude project resources. Follow pagination for remaining pages.'
      };
    }
    if (resource === 'charts') invalid('Chart search requires an OAuth connection.');
    if (resource === 'experiments' || resource === 'flags') {
      const client = createAmplitudeExperimentClient(ctx);
      const input = {
        projectId,
        limit: page.limit ?? 50,
        cursor: managementDiscoveryCursor(page.cursor, binding)
      };
      const response =
        resource === 'flags'
          ? await client.listFlags(input)
          : await client.listExperiments(input);
      return {
        output: managementDiscoveryPage(response, resource, page, binding),
        message:
          'Searched one page of Amplitude configurations. Follow pagination even when this page has no matches.'
      };
    }
    rejectKeyProject(projectId);
    const client = createAmplitudeClient(ctx);
    const response =
      resource === 'events'
        ? await client.getEventTypes()
        : resource === 'event_properties' && eventType
          ? await client.getEventProperties(eventType)
          : resource === 'group_properties'
            ? await client.getGroupProperties(groupType)
            : resource === 'cohorts'
              ? await client.listCohorts()
              : await client.getUserProperties();
    const object =
      resource === 'events'
        ? 'event'
        : resource === 'cohorts'
          ? 'cohort'
          : resource === 'event_properties'
            ? 'event_property'
            : resource === 'group_properties'
              ? 'group_property'
              : 'user_property';
    const idField =
      resource === 'events' ? 'event_type' : resource === 'cohorts' ? 'id' : object;
    const result = localDiscoveryPage(
      discoveryItems(response, resource === 'cohorts' ? 'cohorts' : 'data').map(item =>
        discoveryObject(
          item,
          object,
          idField,
          resource === 'cohorts' ? 'cohort_id' : undefined
        )
      ),
      page,
      binding
    );
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
