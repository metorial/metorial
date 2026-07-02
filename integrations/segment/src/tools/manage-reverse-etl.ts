import { SlateTool } from 'slates';
import { z } from 'zod';
import { SegmentClient } from '../lib/client';
import { spec } from '../spec';

export let manageReverseEtl = SlateTool.create(spec, {
  name: 'Manage Reverse ETL Model',
  key: 'manage_reverse_etl',
  description: `Create, update, list, or delete reverse ETL models. Reverse ETL models define SQL queries against your warehouse and sync results back to downstream destinations on a schedule.`,
  instructions: [
    'To create, provide sourceId, name, query, queryIdentifierColumn, and scheduleStrategy.',
    'scheduleStrategy can be "SPECIFIC_DAYS", "INTERVAL", or "MANUAL".',
    'To update, provide modelId and fields to change.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'list', 'get'])
        .describe('Operation to perform'),
      modelId: z
        .string()
        .optional()
        .describe('Reverse ETL model ID (required for update/delete/get)'),
      sourceId: z.string().optional().describe('Warehouse source ID (required for create)'),
      name: z.string().optional().describe('Model name'),
      description: z.string().optional().describe('Model description'),
      enabled: z.boolean().optional().describe('Whether enabled'),
      query: z.string().optional().describe('SQL query to run against the warehouse'),
      queryIdentifierColumn: z
        .string()
        .optional()
        .describe('Column name used as unique identifier'),
      scheduleStrategy: z
        .string()
        .optional()
        .describe('Schedule type: "SPECIFIC_DAYS", "INTERVAL", or "MANUAL"'),
      scheduleConfig: z
        .record(z.string(), z.any())
        .optional()
        .describe('Schedule configuration (e.g. interval, days)')
    })
  )
  .output(
    z.object({
      modelId: z.string().optional().describe('Model ID'),
      modelName: z.string().optional().describe('Model name'),
      enabled: z.boolean().optional().describe('Whether enabled'),
      deleted: z.boolean().optional().describe('Whether deleted'),
      models: z
        .array(
          z.object({
            modelId: z.string().describe('Model ID'),
            modelName: z.string().optional().describe('Name'),
            sourceId: z.string().optional().describe('Warehouse source ID'),
            enabled: z.boolean().optional().describe('Enabled'),
            scheduleStrategy: z.string().optional().describe('Schedule strategy')
          })
        )
        .optional()
        .describe('List of models (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SegmentClient(ctx.auth.token, ctx.config.region);

    if (ctx.input.action === 'list') {
      let result = await client.listReverseEtlModels();
      let models = (result?.models ?? []).map((m: any) => ({
        modelId: m.id,
        modelName: m.name,
        sourceId: m.sourceId,
        enabled: m.enabled,
        scheduleStrategy: m.scheduleStrategy
      }));
      return {
        output: { models },
        message: `Found **${models.length}** reverse ETL models`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.modelId) throw new Error('modelId is required');
      let m = await client.getReverseEtlModel(ctx.input.modelId);
      return {
        output: {
          modelId: m?.id,
          modelName: m?.name,
          enabled: m?.enabled
        },
        message: `Reverse ETL model **${m?.name ?? ctx.input.modelId}**`
      };
    }

    if (ctx.input.action === 'create') {
      if (
        !ctx.input.sourceId ||
        !ctx.input.name ||
        !ctx.input.query ||
        !ctx.input.queryIdentifierColumn ||
        !ctx.input.scheduleStrategy
      ) {
        throw new Error(
          'sourceId, name, query, queryIdentifierColumn, and scheduleStrategy are required'
        );
      }
      let m = await client.createReverseEtlModel({
        sourceId: ctx.input.sourceId,
        name: ctx.input.name,
        description: ctx.input.description,
        enabled: ctx.input.enabled,
        query: ctx.input.query,
        queryIdentifierColumn: ctx.input.queryIdentifierColumn,
        scheduleStrategy: ctx.input.scheduleStrategy,
        scheduleConfig: ctx.input.scheduleConfig
      });
      return {
        output: {
          modelId: m?.id,
          modelName: m?.name,
          enabled: m?.enabled
        },
        message: `Created reverse ETL model **${m?.name ?? ctx.input.name}**`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.modelId) throw new Error('modelId is required');
      let updateData: Record<string, any> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
      if (ctx.input.enabled !== undefined) updateData.enabled = ctx.input.enabled;
      if (ctx.input.query !== undefined) updateData.query = ctx.input.query;
      if (ctx.input.queryIdentifierColumn !== undefined)
        updateData.queryIdentifierColumn = ctx.input.queryIdentifierColumn;
      if (ctx.input.scheduleStrategy !== undefined)
        updateData.scheduleStrategy = ctx.input.scheduleStrategy;
      if (ctx.input.scheduleConfig !== undefined)
        updateData.scheduleConfig = ctx.input.scheduleConfig;

      let m = await client.updateReverseEtlModel(ctx.input.modelId, updateData);
      return {
        output: {
          modelId: m?.id,
          modelName: m?.name,
          enabled: m?.enabled
        },
        message: `Updated reverse ETL model **${m?.name ?? ctx.input.modelId}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.modelId) throw new Error('modelId is required');
      await client.deleteReverseEtlModel(ctx.input.modelId);
      return {
        output: { modelId: ctx.input.modelId, deleted: true },
        message: `Deleted reverse ETL model \`${ctx.input.modelId}\``
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
