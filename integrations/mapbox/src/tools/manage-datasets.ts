import { SlateTool } from 'slates';
import { z } from 'zod';
import { MapboxClient } from '../lib/client';
import { spec } from '../spec';

let datasetSchema = z.object({
  datasetId: z.string().optional().describe('Dataset ID'),
  owner: z.string().optional().describe('Owner username'),
  name: z.string().optional().describe('Dataset name'),
  description: z.string().optional().describe('Dataset description'),
  created: z.string().optional().describe('Creation timestamp'),
  modified: z.string().optional().describe('Last modified timestamp'),
  featureCount: z.number().optional().describe('Number of features in the dataset'),
  size: z.number().optional().describe('Dataset size in bytes')
});

export let manageDatasetsTool = SlateTool.create(spec, {
  name: 'Manage Datasets',
  key: 'manage_datasets',
  description: `List, create, retrieve, update, or delete Mapbox datasets. Datasets provide persistent storage for custom geographic data as GeoJSON features. Use this to manage dataset containers — use the **Manage Dataset Features** tool to work with individual features within a dataset.`,
  instructions: [
    'Use action "list" to see all datasets in your account.',
    'Use action "create" to make a new dataset with an optional name and description.',
    'Use action "update" to change a dataset\'s name or description.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      datasetId: z
        .string()
        .optional()
        .describe('Dataset ID (required for get, update, delete)'),
      name: z.string().optional().describe('Dataset name (for create/update)'),
      description: z.string().optional().describe('Dataset description (for create/update)'),
      limit: z.number().optional().describe('Max datasets to return (for list)')
    })
  )
  .output(
    z.object({
      dataset: datasetSchema.optional().describe('Dataset details (for get/create/update)'),
      datasets: z.array(datasetSchema).optional().describe('List of datasets (for list)'),
      deleted: z.boolean().optional().describe('Whether the dataset was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MapboxClient({
      token: ctx.auth.token,
      username: ctx.config.username
    });

    let { action } = ctx.input;

    let mapDataset = (d: any) => ({
      datasetId: d.id,
      owner: d.owner,
      name: d.name,
      description: d.description,
      created: d.created,
      modified: d.modified,
      featureCount: d.features,
      size: d.size
    });

    if (action === 'list') {
      let datasets = await client.listDatasets({ limit: ctx.input.limit });
      let mapped = (datasets || []).map(mapDataset);
      return {
        output: { datasets: mapped },
        message: `Found **${mapped.length}** dataset${mapped.length !== 1 ? 's' : ''}.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.datasetId) throw new Error('datasetId is required for get');
      let d = await client.getDataset(ctx.input.datasetId);
      return {
        output: { dataset: mapDataset(d) },
        message: `Retrieved dataset **"${d.name || d.id}"**.`
      };
    }

    if (action === 'create') {
      let d = await client.createDataset({
        name: ctx.input.name,
        description: ctx.input.description
      });
      return {
        output: { dataset: mapDataset(d) },
        message: `Created dataset **"${d.name || d.id}"**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.datasetId) throw new Error('datasetId is required for update');
      let updateData: Record<string, any> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
      let d = await client.updateDataset(ctx.input.datasetId, updateData);
      return {
        output: { dataset: mapDataset(d) },
        message: `Updated dataset **"${d.name || d.id}"**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.datasetId) throw new Error('datasetId is required for delete');
      await client.deleteDataset(ctx.input.datasetId);
      return {
        output: { deleted: true },
        message: `Deleted dataset **${ctx.input.datasetId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  });
