import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let manageSavedQueries = SlateTool.create(spec, {
  name: 'Manage Saved Queries',
  key: 'manage_saved_queries',
  description: `List, get, create, update, delete, or run saved queries in Keen.io. Saved queries allow you to store query parameters for easy reuse. Set a **refreshRate** to turn a saved query into a cached query that is automatically recomputed at the given interval.`,
  instructions: [
    'Use action "list" to see all saved queries.',
    'Use action "get" to retrieve a specific saved query definition.',
    'Use action "run" to execute a saved query and get its result.',
    'Use action "create" or "update" to save a query definition by name.',
    'Use action "delete" to remove a saved query.'
  ],
  constraints: [
    'Creating, updating, listing, and deleting saved queries require a Master Key. Running results supports a Read Key or a suitably permitted Access Key.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'run'])
        .describe('The operation to perform'),
      queryName: z
        .string()
        .optional()
        .describe('Name of the saved query. Required for all actions except "list".'),
      queryDefinition: z
        .object({
          analysisType: z
            .string()
            .optional()
            .describe('Analysis type (e.g. "count", "sum", "average")'),
          collectionName: z.string().optional().describe('Event collection name'),
          targetProperty: z.string().optional().describe('Property to analyze'),
          timeframe: z
            .any()
            .optional()
            .describe('Timeframe (relative string or absolute object)'),
          interval: z.string().optional().describe('Interval for time-series'),
          groupBy: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .describe('Property name(s) to group by'),
          filters: z
            .array(
              z.object({
                propertyName: z.string(),
                operator: z.string(),
                propertyValue: z.any()
              })
            )
            .optional()
            .describe('Filters to apply'),
          timezone: z.string().optional().describe('Timezone'),
          refreshRate: z
            .number()
            .optional()
            .describe(
              'Refresh rate in seconds: 0 disables caching; 14400-172800 enables caching every 4-48 hours'
            )
        })
        .optional()
        .describe('The query definition. Required for "create" and "update" actions.')
    })
  )
  .output(
    z.object({
      savedQueries: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of saved queries (for "list" action)'),
      savedQuery: z
        .record(z.string(), z.any())
        .optional()
        .describe('Saved query definition (for "get" action)'),
      queryResult: z.any().optional().describe('Query result (for "run" action)'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    switch (ctx.input.action) {
      case 'list': {
        let queries = await client.listSavedQueries();
        return {
          output: { savedQueries: queries, success: true },
          message: `Found **${queries.length}** saved queries.`
        };
      }

      case 'get': {
        if (!ctx.input.queryName)
          throw createApiServiceError('queryName is required for "get" action');
        let query = await client.getSavedQuery(ctx.input.queryName);
        return {
          output: { savedQuery: query, success: true },
          message: `Retrieved saved query **${ctx.input.queryName}**.`
        };
      }

      case 'run': {
        if (!ctx.input.queryName)
          throw createApiServiceError('queryName is required for "run" action');
        let result = await client.runSavedQuery(ctx.input.queryName);
        return {
          output: { queryResult: result, success: true },
          message: `Executed saved query **${ctx.input.queryName}**.`
        };
      }

      case 'create':
      case 'update': {
        if (!ctx.input.queryName)
          throw createApiServiceError('queryName is required for "create"/"update" action');
        if (!ctx.input.queryDefinition)
          throw createApiServiceError(
            'queryDefinition is required for "create"/"update" action'
          );

        let definition = ctx.input.queryDefinition;
        if (
          definition.refreshRate !== undefined &&
          (!Number.isInteger(definition.refreshRate) ||
            (definition.refreshRate !== 0 &&
              (definition.refreshRate < 14400 || definition.refreshRate > 172800)))
        ) {
          throw createApiServiceError(
            'refreshRate must be 0 to disable caching or a whole number from 14400 to 172800 seconds.'
          );
        }
        let query: Record<string, any> = {};
        if (definition.analysisType !== undefined)
          query.analysis_type = definition.analysisType;
        if (definition.collectionName !== undefined)
          query.event_collection = definition.collectionName;
        if (ctx.input.queryDefinition.targetProperty)
          query.target_property = ctx.input.queryDefinition.targetProperty;
        if (ctx.input.queryDefinition.timeframe)
          query.timeframe = ctx.input.queryDefinition.timeframe;
        if (ctx.input.queryDefinition.interval)
          query.interval = ctx.input.queryDefinition.interval;
        if (ctx.input.queryDefinition.groupBy)
          query.group_by = ctx.input.queryDefinition.groupBy;
        if (ctx.input.queryDefinition.timezone)
          query.timezone = ctx.input.queryDefinition.timezone;
        if (ctx.input.queryDefinition.filters) {
          query.filters = ctx.input.queryDefinition.filters.map(f => ({
            property_name: f.propertyName,
            operator: f.operator,
            property_value: f.propertyValue
          }));
        }

        let def: Record<string, any> = {};
        if (Object.keys(query).length > 0) def.query = query;
        if (definition.refreshRate !== undefined) def.refresh_rate = definition.refreshRate;
        if (
          ctx.input.action === 'create' &&
          (!definition.analysisType || !definition.collectionName)
        ) {
          throw createApiServiceError(
            'queryDefinition.analysisType and collectionName are required to create a saved query.'
          );
        }
        if (Object.keys(def).length === 0) {
          throw createApiServiceError(
            'Provide query fields or refreshRate to create or update a saved query.'
          );
        }
        if (ctx.input.action === 'update' && def.query) {
          let existing = await client.getSavedQuery(ctx.input.queryName);
          if (!isApiErrorRecord(existing.query)) {
            throw createApiServiceError(
              'Keen.io returned a saved query without a query definition.'
            );
          }
          def.query = { ...existing.query, ...query };
        }

        let saved = await client.createSavedQuery(ctx.input.queryName, def);
        return {
          output: { savedQuery: saved, success: true },
          message: `${ctx.input.action === 'create' ? 'Created' : 'Updated'} saved query **${ctx.input.queryName}**.`
        };
      }

      case 'delete': {
        if (!ctx.input.queryName)
          throw createApiServiceError('queryName is required for "delete" action');
        await client.deleteSavedQuery(ctx.input.queryName);
        return {
          output: { success: true },
          message: `Deleted saved query **${ctx.input.queryName}**.`
        };
      }
    }
  });
