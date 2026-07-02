import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelemetryClient } from '../lib/telemetry-client';
import { spec } from '../spec';

let sourceSchema = z.object({
  sourceId: z.string().describe('Source ID'),
  name: z.string().nullable().describe('Source name'),
  platform: z.string().nullable().describe('Platform type (e.g., http, nginx, apache)'),
  token: z.string().nullable().describe('Source ingestion token'),
  tableId: z.string().nullable().describe('Table ID in the data warehouse'),
  logsRetentionDays: z.number().nullable().describe('Log retention period in days'),
  metricsRetentionDays: z.number().nullable().describe('Metrics retention period in days'),
  liveTrailEnabled: z.boolean().nullable().describe('Whether live tail is enabled'),
  createdAt: z.string().nullable().describe('Creation timestamp'),
  updatedAt: z.string().nullable().describe('Last update timestamp')
});

export let manageSource = SlateTool.create(spec, {
  name: 'Manage Source',
  key: 'manage_source',
  description: `List, get, create, update, or delete telemetry log sources. Sources define where logs are ingested from, with configurable platforms, data regions, retention periods, and VRL transformations.`,
  instructions: [
    'Use action "list" to list all sources.',
    'Use action "get" to get details of a specific source.',
    'Use action "create" to create a new source.',
    'Use action "update" to modify an existing source.',
    'Use action "delete" to remove a source.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      sourceId: z.string().optional().describe('Source ID (required for get, update, delete)'),
      name: z.string().optional().describe('Source name (for create/update)'),
      platform: z
        .string()
        .optional()
        .describe('Platform type: http, nginx, apache, docker, javascript, etc.'),
      logsRetentionDays: z.number().optional().describe('Log retention in days'),
      metricsRetentionDays: z.number().optional().describe('Metrics retention in days'),
      liveTrailEnabled: z.boolean().optional().describe('Enable live tail'),
      ingestingPaused: z.boolean().optional().describe('Pause log ingestion'),
      page: z.number().optional().describe('Page number for list action'),
      perPage: z.number().optional().describe('Results per page for list action')
    })
  )
  .output(
    z.object({
      sources: z.array(sourceSchema).optional().describe('List of sources'),
      source: sourceSchema.optional().describe('Single source'),
      hasMore: z.boolean().optional().describe('Whether more results are available'),
      deleted: z.boolean().optional().describe('Whether the source was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelemetryClient({
      token: ctx.auth.token,
      teamName: ctx.config.teamName
    });

    let { action, sourceId } = ctx.input;

    let mapSource = (item: any) => {
      let attrs = item.attributes || item;
      return {
        sourceId: String(item.id),
        name: attrs.name || null,
        platform: attrs.platform || null,
        token: attrs.token || null,
        tableId: attrs.table_id ? String(attrs.table_id) : null,
        logsRetentionDays: attrs.logs_retention ?? null,
        metricsRetentionDays: attrs.metrics_retention ?? null,
        liveTrailEnabled: attrs.live_trail_enabled ?? null,
        createdAt: attrs.created_at || null,
        updatedAt: attrs.updated_at || null
      };
    };

    if (action === 'list') {
      let result = await client.listSources({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let sources = (result.data || []).map(mapSource);
      return {
        output: { sources, hasMore: !!result.pagination?.next },
        message: `Found **${sources.length}** source(s).`
      };
    }

    if (action === 'get') {
      if (!sourceId) throw new Error('sourceId is required for get action');
      let result = await client.getSource(sourceId);
      return {
        output: { source: mapSource(result.data || result) },
        message: `Source retrieved.`
      };
    }

    if (action === 'delete') {
      if (!sourceId) throw new Error('sourceId is required for delete action');
      await client.deleteSource(sourceId);
      return {
        output: { deleted: true },
        message: `Source **${sourceId}** deleted.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.platform) body.platform = ctx.input.platform;
    if (ctx.input.logsRetentionDays !== undefined)
      body.logs_retention = ctx.input.logsRetentionDays;
    if (ctx.input.metricsRetentionDays !== undefined)
      body.metrics_retention = ctx.input.metricsRetentionDays;
    if (ctx.input.liveTrailEnabled !== undefined)
      body.live_trail_enabled = ctx.input.liveTrailEnabled;
    if (ctx.input.ingestingPaused !== undefined)
      body.ingesting_paused = ctx.input.ingestingPaused;

    let result: any;
    if (action === 'create') {
      result = await client.createSource(body);
    } else {
      if (!sourceId) throw new Error('sourceId is required for update action');
      result = await client.updateSource(sourceId, body);
    }

    let src = mapSource(result.data || result);
    return {
      output: { source: src },
      message: `Source **${src.name || src.sourceId}** ${action === 'create' ? 'created' : 'updated'}.`
    };
  })
  .build();
