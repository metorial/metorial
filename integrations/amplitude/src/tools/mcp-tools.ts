import { createApiServiceError, SlateTool } from 'slates';
import type { z } from 'zod';
import {
  type AmplitudeMcpTool,
  amplitudeMcpOutputSchema,
  callAmplitudeMcpTool
} from '../lib/mcp-client';
import { hostedMcpInputSchemas as schemas } from '../lib/mcp-schemas';
import { spec } from '../spec';

const invalid = (message: string): never => {
  throw createApiServiceError(message, { reason: 'amplitude_invalid_input' });
};
const numericId = (value: string) => {
  const id = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id <= 0)
    invalid('Use a numeric project ID returned by get_amplitude_context.');
  return id;
};

const hostedTool = <S extends z.ZodRawShape>(options: {
  key: string;
  name: string;
  description: string;
  input: z.ZodObject<S>;
  upstream: AmplitudeMcpTool;
  readOnly?: boolean;
  destructive?: boolean;
  arguments?: (input: Readonly<z.infer<z.ZodObject<S>>>) => Record<string, unknown>;
}) =>
  SlateTool.create(spec, {
    key: options.key,
    name: options.name,
    description: `Requires Amplitude MCP OAuth; unavailable with project API-key credentials. ${options.description}`,
    tags: { readOnly: options.readOnly ?? true, destructive: options.destructive ?? false }
  })
    .authMethods(['mcp_oauth'])
    .input(options.input)
    .output(amplitudeMcpOutputSchema)
    .handleInvocation(ctx => {
      const args = options.arguments ? options.arguments(ctx.input) : ctx.input;
      if (args.branchId !== undefined && args.branchName !== undefined)
        invalid('Supply either branchId or branchName, not both.');
      return callAmplitudeMcpTool(ctx.auth, options.upstream, args);
    })
    .build();

export const getAmplitudeContextTool = hostedTool({
  key: 'get_amplitude_context',
  name: 'Get Amplitude Context',
  description:
    'Discover your current user, organization, and accessible projects for OAuth-hosted tools. Supply a discovered project ID for settings, time zone, session definition, and AI context. Optionally list or search uploaded context documents. This is not a prerequisite for API-key REST queries: those credentials already identify the project. For active/new-user counts on an API-key connection, call query_active_users directly.',
  input: schemas.get_amplitude_context,
  upstream: 'get_amplitude_context',
  arguments: ({ projectId, ...input }) => ({
    ...input,
    ...(projectId !== undefined ? { projectId: numericId(projectId) } : {})
  })
});
export const searchAmplitudeTool = hostedTool({
  key: 'search',
  name: 'Search Amplitude',
  description:
    'Find charts, dashboards, notebooks, experiments, flags, cohorts, events, properties, metrics, and documentation by name. Returns IDs for subsequent reads or edits. Omit queries or use an empty array to browse. Call get_amplitude_context to discover project IDs.',
  input: schemas.search,
  upstream: 'search_amp_entities',
  arguments: ({ appIds, ...input }) => ({
    ...input,
    ...(appIds ? { appIds: appIds.map(numericId) } : {})
  })
});
export const getExperimentsTool = hostedTool({
  key: 'get_experiments',
  name: 'Get Amplitude Experiments',
  description:
    'Read experiment configuration by IDs discovered with search (entityTypes EXPERIMENT). For variant performance and statistical results use query_experiment instead.',
  input: schemas.get_experiments,
  upstream: 'use_amp_experiments',
  arguments: input => ({ ...input, action: 'get' })
});
export const queryExperimentTool = hostedTool({
  key: 'query_experiment',
  name: 'Query Experiment',
  description:
    'Analyze experiment results, variant performance, and statistical significance by ID from search. Omit metricIds for the primary/recommended metric; specify metric IDs only when requested. Supports one group-by and metric filters. This reads analysis, not flag configuration.',
  input: schemas.query_experiment,
  upstream: 'use_amp_experiments',
  arguments: input => ({ ...input, action: 'analyze' })
});
export const getFlagsTool = hostedTool({
  key: 'get_flags',
  name: 'Get Amplitude Flags',
  description:
    'Read feature flag configuration by IDs or keys from search (entityTypes FLAG). Does not change rollout, testers, or deployments. For experiment analysis use query_experiment.',
  input: schemas.get_flags,
  upstream: 'use_amp_flags',
  arguments: input => ({ ...input, action: 'get' })
});
export const getDeploymentsTool = hostedTool({
  key: 'get_deployments',
  name: 'Get Amplitude Deployments',
  description:
    'List Experiment deployments for the connected account project, shared by feature flags and experiments. Returns deployment identifiers and configuration without changing deployments.',
  input: schemas.get_deployments,
  upstream: 'use_amp_flags',
  arguments: input => ({ ...input, action: 'list_deployments' })
});
export const manageAmpEventsTool = hostedTool({
  key: 'manage_amp_events',
  name: 'Read Amplitude Events',
  description:
    'Read tracking-plan events, custom events, and labeled event definitions. Only get is supported: this never ingests events or changes tracking plans. Discover project IDs with get_amplitude_context. Supports exact-name filters, field projection, branches, and pagination.',
  input: schemas.manage_amp_events,
  upstream: 'manage_amp_events',
  arguments: input => ({ ...input, action: 'get' })
});
export const getPropertiesTool = hostedTool({
  key: 'get_properties',
  name: 'Get Amplitude Properties',
  description:
    'Read event, user, group, derived, lookup, channel, or persisted properties from a project tracking plan. Defaults to event properties; eventType optionally scopes them to one event. Discover project IDs with get_amplitude_context. Supports branches, field projection, and pagination.',
  input: schemas.get_properties,
  upstream: 'get_amp_taxonomy',
  arguments: input => ({ ...input, action: 'properties' })
});
export const getAmplitudeChartsTool = hostedTool({
  key: 'get_amplitude_charts',
  name: 'Get Amplitude Charts',
  description:
    'Read saved charts by IDs from search: include link returns URLs, typed returns editable parameters, definition returns raw configuration, and data executes charts. Use guide without IDs to discover chart types and parameter schemas. Data accepts at most three chart IDs or edit IDs combined. For downloadable saved-chart CSV use get_chart_results.',
  input: schemas.get_amplitude_charts,
  upstream: 'get_amplitude_charts',
  arguments: input => {
    const mode = input.include ?? 'link';
    const count = (input.chartIds?.length ?? 0) + (input.chartEditIds?.length ?? 0);
    if (mode !== 'guide' && !count)
      invalid('Discover chart IDs with search or query_amplitude_data before reading charts.');
    if (mode === 'data' && count > 3)
      invalid('Data mode accepts at most three chart IDs and edit IDs combined.');
    if ((mode === 'typed' || mode === 'definition') && input.chartEditIds?.length)
      invalid('Typed and definition modes require saved chartIds, not chartEditIds.');
    if (mode !== 'guide' && input.chartType !== undefined)
      invalid('chartType applies only to guide mode.');
    if (
      mode !== 'data' &&
      [
        input.groupByLimit,
        input.excludeIncompleteDatapoints,
        input.timeSeriesLimit,
        input.vis,
        input.theme,
        input.includeAdditionalInfo
      ].some(value => value !== undefined)
    )
      invalid('Data options apply only when include is data.');
    return input;
  }
});
export const queryAmplitudeDataTool = hostedTool({
  key: 'query_amplitude_data',
  name: 'Query Amplitude Data',
  description:
    'Run ad-hoc segmentation, funnel, retention, sessions, or data-table analytics using a typed chart. Discover exact event/property names with search/get_properties and project IDs with get_amplitude_context. Supply exactly one chart or raw definition, with a descriptive name and explicit date range. To modify a chart, read its typed parameters then pass chartId with the edited chart. Returns chartEditId for render_amplitude_chart and save_chart_edits; it does not persist a saved chart. For uniques use overallSeries, never sum intervals; for pct_dau use timeSeriesAverage.',
  input: schemas.query_amplitude_data,
  upstream: 'query_amplitude_data',
  arguments: input => {
    if ((input.chart !== undefined) === (input.definition !== undefined))
      invalid('Supply exactly one of chart or definition.');
    if (input.definition && input.definition.app !== input.projectId)
      invalid('definition.app must match projectId.');
    if (
      input.chart &&
      (input.chart.kind === 'segmentation' || input.chart.kind === 'funnel') &&
      input.chart.measured_as?.as_ !== undefined
    ) {
      const { as_, ...measurement } = input.chart.measured_as;
      if (measurement.as !== undefined && measurement.as !== as_)
        invalid('measured_as.as and as_ cannot disagree.');
      return { ...input, chart: { ...input.chart, measured_as: { ...measurement, as: as_ } } };
    }
    return input;
  }
});
export const renderAmplitudeChartTool = hostedTool({
  key: 'render_amplitude_chart',
  name: 'Render Amplitude Chart',
  description:
    'Render a saved chart or chart edit as an Amplitude visualization. Supply one chartId from search or chartEditId from query_amplitude_data. Rendering does not save or rename charts; use save_chart_edits or rename_chart to persist those changes.',
  input: schemas.render_amplitude_chart,
  upstream: 'render_amplitude_chart',
  arguments: input => {
    if (Boolean(input.chartId) === Boolean(input.chartEditId))
      invalid('Supply exactly one of chartId or chartEditId.');
    return input;
  }
});
export const saveChartEditsTool = hostedTool({
  key: 'save_chart_edits',
  name: 'Save Amplitude Chart Edits',
  description:
    'Persist chart edits returned by query_amplitude_data as saved Amplitude charts with names and descriptions. Returns permanent chart IDs; verify with get_amplitude_charts. Saves to personal space by default; an explicit shared-space destination may publish and notify members.',
  input: schemas.save_chart_edits,
  upstream: 'save_chart_edits',
  readOnly: false
});
export const renameChartTool = hostedTool({
  key: 'rename_chart',
  name: 'Rename Amplitude Chart',
  description:
    'Persist a new name for an existing saved chart. Optionally replace its description; omitting description preserves it. Obtain chartId from search or get_amplitude_charts and verify changes with a separate read.',
  input: schemas.rename_chart,
  upstream: 'rename_chart',
  readOnly: false,
  destructive: true
});
export const useAmplitudeChartMonitorsTool = hostedTool({
  key: 'use_amplitude_chart_monitors',
  name: 'Use Amplitude Chart Monitors',
  description:
    'Read monitor alerts, configuration, and history; subscribe/unsubscribe deliveries or enable/disable an existing monitor. Discover project IDs with get_amplitude_context and charts with search. Subscription changes require monitorId and deliveryMethod; update requires monitorId and enabled.',
  input: schemas.use_amplitude_chart_monitors,
  upstream: 'use_amplitude_chart_monitors',
  readOnly: false,
  destructive: true,
  arguments: input => {
    if (input.action === 'get_config' && !input.chartId)
      invalid('get_config requires chartId.');
    if (input.action === 'history' && !input.monitorId && !input.chartId)
      invalid('history requires monitorId or chartId.');
    if (
      ['subscribe', 'unsubscribe', 'update'].includes(input.action ?? '') &&
      !input.monitorId
    )
      invalid('This monitor operation requires monitorId from get_config.');
    if (input.action === 'update' && input.enabled === undefined)
      invalid('update requires enabled.');
    if (input.action === 'subscribe' || input.action === 'unsubscribe') {
      if (!input.deliveryMethod) invalid('Subscription changes require deliveryMethod.');
      if (input.deliveryMethod !== 'email' && !input.deliveryChannel)
        invalid('Slack and Teams deliveries require deliveryChannel.');
    }
    return input;
  }
});
export const useAmpDashboardsTool = hostedTool({
  key: 'use_amp_dashboards',
  name: 'Use Amplitude Dashboards',
  description:
    'Read, create, or edit dashboards; discover or replace chart properties; subscribe or edit scheduled delivery. Find IDs with search. Get reads up to three dashboardIds; create requires name and rows. Before editing read the dashboard and pass expectedLastModified. Layout changes and replacements may affect shared content. Request delivery channel and cadence before subscribing; do not assume them.',
  input: schemas.use_amp_dashboards,
  upstream: 'use_amp_dashboards',
  readOnly: false,
  destructive: true,
  arguments: input => {
    if (input.action === 'get' && !input.dashboardIds?.length)
      invalid('get requires dashboardIds discovered with search.');
    if (input.action === 'create' && (!input.name || !input.rows?.length))
      invalid('create requires name and rows.');
    if (
      ['edit', 'replace_properties', 'subscribe'].includes(input.action) &&
      !input.dashboardId
    )
      invalid('This operation requires dashboardId.');
    if (
      input.action === 'edit' &&
      (input.expectedLastModified === undefined || (!input.metadata && !input.edit))
    )
      invalid(
        'Read the dashboard first; edit requires expectedLastModified and metadata or edit.'
      );
    if (input.action === 'edit_subscription' && !input.subscriptionId)
      invalid('edit_subscription requires subscriptionId.');
    return input;
  }
});
export const useAmpNotebooksTool = hostedTool({
  key: 'use_amp_notebooks',
  name: 'Use Amplitude Notebooks',
  description:
    'Read, create, or edit notebooks containing charts, rich text, images, video, cohorts, and session replays. Find IDs with search. Create requires name and rows; use rich_text for Markdown. Before editing read the notebook and pass expectedLastModifiedAt. A layout edit can replace or remove existing content.',
  input: schemas.use_amp_notebooks,
  upstream: 'use_amp_notebooks',
  readOnly: false,
  destructive: true,
  arguments: input => {
    if (input.action === 'get' && !input.notebookIds?.length && !input.notebookId)
      invalid('get requires notebookIds or notebookId discovered with search.');
    if (input.action === 'create' && (!input.name || !input.rows?.length))
      invalid('create requires name and rows.');
    if (
      input.action === 'edit' &&
      (!input.notebookId ||
        input.expectedLastModifiedAt === undefined ||
        (!input.metadata && !input.edit && !input.name))
    )
      invalid(
        'Read the notebook first; edit requires notebookId, expectedLastModifiedAt, and metadata or a layout edit.'
      );
    return input;
  }
});
export const amplitudeHostedMcpTools = [
  getAmplitudeContextTool,
  searchAmplitudeTool,
  getExperimentsTool,
  queryExperimentTool,
  getFlagsTool,
  getDeploymentsTool,
  manageAmpEventsTool,
  getPropertiesTool,
  getAmplitudeChartsTool,
  queryAmplitudeDataTool,
  renderAmplitudeChartTool,
  saveChartEditsTool,
  renameChartTool,
  useAmplitudeChartMonitorsTool,
  useAmpDashboardsTool,
  useAmpNotebooksTool
];
