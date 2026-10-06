import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  type ApiResource,
  nextUrlSchema,
  type ResourceResponse,
  requireFields,
  teamNameSchema
} from '../lib/api';
import { TelemetryClient } from '../lib/telemetry-client';
import { spec } from '../spec';

let sourceSchema = z.object({
  sourceId: z.string().describe('Source ID'),
  name: z.string().nullable().describe('Source name'),
  platform: z.string().nullable().describe('Platform type (e.g., http, nginx, apache)'),
  token: z
    .string()
    .nullable()
    .describe('Legacy field; ingestion credentials are not returned'),
  tableId: z.string().nullable().describe('Table ID in the data warehouse'),
  tableName: z.string().optional().describe('Actual telemetry table name'),
  dataRegion: z.string().optional().describe('Source data region'),
  ingestingPaused: z.boolean().optional().describe('Whether ingestion is paused'),
  logsRetentionDays: z.number().nullable().describe('Log retention period in days'),
  metricsRetentionDays: z.number().nullable().describe('Metrics retention period in days'),
  liveTrailEnabled: z.boolean().nullable().describe('Whether live tail is enabled'),
  createdAt: z.string().nullable().describe('Creation timestamp'),
  updatedAt: z.string().nullable().describe('Last update timestamp')
});

export let manageSource = SlateTool.create(spec, {
  name: 'Manage Source',
  key: 'manage_source',
  description: `List, get, create, update, or delete telemetry log sources. Configure ingestion, retention and VRL transformations. Longer retention may incur additional charges. Source platform and data region are selected during creation.`,
  tags: { readOnly: false, destructive: true },
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
      teamName: teamNameSchema,
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      sourceId: z.string().optional().describe('Source ID (required for get, update, delete)'),
      name: z.string().optional().describe('Source name (for create/update)'),
      platform: z
        .string()
        .optional()
        .describe('Platform for creation: http, nginx, apache, docker, javascript, etc.'),
      logsRetentionDays: z.number().optional().describe('Log retention in days'),
      metricsRetentionDays: z.number().optional().describe('Metrics retention in days'),
      liveTrailEnabled: z
        .boolean()
        .optional()
        .describe('Legacy field unsupported by the current API; omit'),
      dataRegion: z
        .string()
        .optional()
        .describe('Data region for creation, such as us_west, germany or singapore'),
      liveTailPattern: z
        .string()
        .optional()
        .describe('Live-tail message format, with columns in braces'),
      vrlTransformationLogs: z
        .string()
        .optional()
        .describe('VRL transformation applied to ingested logs'),
      ingestingPaused: z.boolean().optional().describe('Pause log ingestion'),
      nextUrl: nextUrlSchema,
      page: z.number().optional().describe('Page number for list action'),
      perPage: z.number().optional().describe('Results per page for list action')
    })
  )
  .output(
    z.object({
      sources: z.array(sourceSchema).optional().describe('List of sources'),
      source: sourceSchema.optional().describe('Single source'),
      nextUrl: z.string().optional().describe('Next-page URL, when available'),
      hasMore: z.boolean().optional().describe('Whether more results are available'),
      deleted: z.boolean().optional().describe('Whether the source was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelemetryClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      teamName: ctx.input.teamName ?? ctx.config.teamName
    });

    let { action, sourceId } = ctx.input;

    let mapSource = (item: ApiResource) => {
      let attrs = item.attributes;
      return {
        sourceId: String(item.id),
        name: attrs.name || null,
        platform: attrs.platform || null,
        token: null,
        tableId: attrs.table_id ? String(attrs.table_id) : null,
        tableName: attrs.table_name ?? undefined,
        dataRegion: attrs.data_region ?? undefined,
        ingestingPaused: attrs.ingesting_paused ?? undefined,
        logsRetentionDays: attrs.logs_retention ?? null,
        metricsRetentionDays: attrs.metrics_retention ?? null,
        liveTrailEnabled: attrs.live_trail_enabled ?? null,
        createdAt: attrs.created_at || null,
        updatedAt: attrs.updated_at || null
      };
    };

    if (action === 'list') {
      let result = await client.listSources({
        nextUrl: ctx.input.nextUrl,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let sources = (result.data || []).map(mapSource);
      return {
        output: {
          sources,
          hasMore: !!result.pagination?.next,
          nextUrl: result.pagination?.next ?? undefined
        },
        message: `Found **${sources.length}** source(s).`
      };
    }

    if (action === 'get') {
      if (!sourceId) throw createApiServiceError('sourceId is required for get action');
      let result = await client.getSource(sourceId);
      return {
        output: { source: mapSource(result.data || result) },
        message: `Source retrieved.`
      };
    }

    if (action === 'delete') {
      if (!sourceId) throw createApiServiceError('sourceId is required for delete action');
      await client.deleteSource(sourceId);
      return {
        output: { deleted: true },
        message: `Source **${sourceId}** deleted.`
      };
    }

    let body: Record<string, unknown> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.platform) body.platform = ctx.input.platform;
    if (ctx.input.logsRetentionDays !== undefined)
      body.logs_retention = ctx.input.logsRetentionDays;
    if (ctx.input.metricsRetentionDays !== undefined)
      body.metrics_retention = ctx.input.metricsRetentionDays;
    if (ctx.input.liveTrailEnabled !== undefined)
      throw createApiServiceError(
        'The current source API does not support liveTrailEnabled. Omit this legacy field; liveTailPattern controls message formatting.'
      );
    if (ctx.input.dataRegion !== undefined) body.data_region = ctx.input.dataRegion;
    if (ctx.input.liveTailPattern !== undefined)
      body.live_tail_pattern = ctx.input.liveTailPattern;
    if (ctx.input.vrlTransformationLogs !== undefined)
      body.vrl_transformation_logs = ctx.input.vrlTransformationLogs;
    if (ctx.input.ingestingPaused !== undefined)
      body.ingesting_paused = ctx.input.ingestingPaused;

    let result: ResourceResponse;
    if (action === 'create') {
      requireFields(ctx.input.name, ctx.input.platform);
      result = await client.createSource(body);
    } else {
      if (!sourceId) throw createApiServiceError('sourceId is required for update action');
      if (ctx.input.platform !== undefined || ctx.input.dataRegion !== undefined)
        throw createApiServiceError(
          'platform and dataRegion are creation fields and cannot be changed through the source update API.'
        );
      result = await client.updateSource(sourceId, body);
    }

    let src = mapSource(result.data || result);
    return {
      output: { source: src },
      message: `Source **${src.name || src.sourceId}** ${action === 'create' ? 'created' : 'updated'}.`
    };
  })
  .build();
