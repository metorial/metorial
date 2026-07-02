import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCachedDatasets = SlateTool.create(spec, {
  name: 'Manage Cached Datasets',
  key: 'manage_cached_datasets',
  description: `List, get, create, delete, or retrieve results from Keen.io Cached Datasets. Cached Datasets provide pre-computed, indexed query results with sub-second response times. Ideal for building customer-facing embedded analytics without affecting ad-hoc query rate limits.`,
  instructions: [
    'When creating a dataset, provide a query definition, interval, and index property.',
    'Use "get_results" to fetch pre-computed results by index value and timeframe.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'delete', 'get_results'])
        .describe('The operation to perform'),
      datasetName: z
        .string()
        .optional()
        .describe('Name of the dataset. Required for all actions except "list".'),
      datasetDefinition: z
        .object({
          displayName: z.string().optional().describe('Display name for the dataset'),
          query: z
            .object({
              projectId: z
                .string()
                .optional()
                .describe('Project ID (defaults to current project)'),
              analysisType: z.string().describe('Analysis type (e.g. "count", "sum")'),
              collectionName: z.string().describe('Event collection name'),
              targetProperty: z.string().optional().describe('Property to analyze'),
              timeframe: z.string().describe('Relative timeframe string'),
              interval: z
                .string()
                .describe('Time interval for the dataset (e.g. "daily", "hourly")'),
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
            })
            .optional()
            .describe('Query definition for the dataset'),
          indexBy: z
            .string()
            .optional()
            .describe('Property to index results by (must be in group_by)')
        })
        .optional()
        .describe('Dataset configuration. Required for "create" action.'),
      resultParams: z
        .object({
          indexBy: z.string().describe('Index value to look up'),
          timeframe: z
            .object({
              start: z.string().describe('ISO 8601 start datetime'),
              end: z.string().describe('ISO 8601 end datetime')
            })
            .describe('Timeframe for the results')
        })
        .optional()
        .describe(
          'Parameters for retrieving dataset results. Required for "get_results" action.'
        )
    })
  )
  .output(
    z.object({
      datasets: z.any().optional().describe('List of datasets (for "list" action)'),
      dataset: z.record(z.string(), z.any()).optional().describe('Dataset details'),
      datasetResults: z
        .any()
        .optional()
        .describe('Pre-computed dataset results (for "get_results" action)'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      projectId: ctx.config.projectId,
      token: ctx.auth.token
    });

    switch (ctx.input.action) {
      case 'list': {
        let datasets = await client.listDatasets();
        return {
          output: { datasets, success: true },
          message: `Listed cached datasets.`
        };
      }

      case 'get': {
        if (!ctx.input.datasetName)
          throw new Error('datasetName is required for "get" action');
        let dataset = await client.getDataset(ctx.input.datasetName);
        return {
          output: { dataset, success: true },
          message: `Retrieved dataset **${ctx.input.datasetName}**.`
        };
      }

      case 'create': {
        if (!ctx.input.datasetName)
          throw new Error('datasetName is required for "create" action');
        if (!ctx.input.datasetDefinition?.query)
          throw new Error('datasetDefinition with query is required for "create" action');
        if (!ctx.input.datasetDefinition.indexBy)
          throw new Error('datasetDefinition.indexBy is required for "create" action');

        let q = ctx.input.datasetDefinition.query;
        let def: Record<string, any> = {
          display_name: ctx.input.datasetDefinition.displayName || ctx.input.datasetName,
          query: {
            project_id: q.projectId || ctx.config.projectId,
            analysis_type: q.analysisType,
            event_collection: q.collectionName,
            timeframe: q.timeframe,
            interval: q.interval
          },
          index_by: ctx.input.datasetDefinition.indexBy
        };

        if (q.targetProperty) def.query.target_property = q.targetProperty;
        if (q.groupBy) def.query.group_by = q.groupBy;
        if (q.filters) {
          def.query.filters = q.filters.map(f => ({
            property_name: f.propertyName,
            operator: f.operator,
            property_value: f.propertyValue
          }));
        }

        let created = await client.createDataset(ctx.input.datasetName, def);
        return {
          output: { dataset: created, success: true },
          message: `Created cached dataset **${ctx.input.datasetName}**.`
        };
      }

      case 'delete': {
        if (!ctx.input.datasetName)
          throw new Error('datasetName is required for "delete" action');
        await client.deleteDataset(ctx.input.datasetName);
        return {
          output: { success: true },
          message: `Deleted cached dataset **${ctx.input.datasetName}**.`
        };
      }

      case 'get_results': {
        if (!ctx.input.datasetName)
          throw new Error('datasetName is required for "get_results" action');
        if (!ctx.input.resultParams)
          throw new Error('resultParams is required for "get_results" action');
        let results = await client.getDatasetResults(
          ctx.input.datasetName,
          ctx.input.resultParams.indexBy,
          ctx.input.resultParams.timeframe
        );
        return {
          output: { datasetResults: results, success: true },
          message: `Retrieved results from dataset **${ctx.input.datasetName}**.`
        };
      }
    }
  });
