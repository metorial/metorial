import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ModeClient, requireToken } from '../lib/client';
import { getEmbedded, normalizeDataset } from '../lib/helpers';
import { spec } from '../spec';

let datasetSchema = z.object({
  datasetToken: z.string().describe('Unique token of the dataset'),
  name: z.string().describe('Name of the dataset'),
  description: z.string().describe('Description of the dataset'),
  createdAt: z.string(),
  updatedAt: z.string()
});

export let listDatasets = SlateTool.create(spec, {
  name: 'List Datasets',
  key: 'list_datasets',
  description: `List datasets in the workspace. Filter by collection or data source. Supports ordering by creation or update timestamps.`,
  instructions: ['Provide either a collectionToken or dataSourceToken to scope the results.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionToken: z
        .string()
        .optional()
        .describe('Token of the collection to list datasets from'),
      dataSourceToken: z
        .string()
        .optional()
        .describe('Token of the data source to list datasets for'),
      filter: z
        .string()
        .optional()
        .describe('Filter expression, e.g. "created_at.gt.2024-01-01T00:00:00Z"'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      orderBy: z.enum(['created_at', 'updated_at']).optional().describe('Field to order by')
    })
  )
  .output(
    z.object({
      datasets: z.array(datasetSchema)
    })
  )
  .handleInvocation(async ctx => {
    const client = ModeClient.fromContext(ctx);

    let options = {
      filter: ctx.input.filter,
      order: ctx.input.order,
      orderBy: ctx.input.orderBy
    };

    if (
      (ctx.input.collectionToken !== undefined) ===
      (ctx.input.dataSourceToken !== undefined)
    )
      throw createApiServiceError('Provide exactly one collectionToken or dataSourceToken.');
    const data =
      ctx.input.dataSourceToken !== undefined
        ? await client.listDatasetsByDataSource(ctx.input.dataSourceToken, options)
        : await client.listDatasetsInCollection(
            requireToken(ctx.input.collectionToken, 'collectionToken'),
            options
          );

    let datasets = getEmbedded(data, 'datasets').map(normalizeDataset);

    return {
      output: { datasets },
      message: `Found **${datasets.length}** datasets.`
    };
  })
  .build();

export let manageDataset = SlateTool.create(spec, {
  name: 'Manage Dataset',
  key: 'manage_dataset',
  description: `Update or delete a Mode dataset.
Use **update** to change the dataset's name, description, or move it to a different collection.
Use **delete** to permanently remove a dataset.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['update', 'delete']).describe('Action to perform'),
      datasetToken: z.string().describe('Token of the dataset'),
      name: z.string().optional().describe('New name for the dataset (update only)'),
      description: z
        .string()
        .optional()
        .describe('New description for the dataset (update only)'),
      collectionToken: z
        .string()
        .optional()
        .describe('Token of the collection to move the dataset to (update only)')
    })
  )
  .output(datasetSchema)
  .handleInvocation(async ctx => {
    const client = ModeClient.fromContext(ctx);

    if (ctx.input.action === 'delete') {
      let existing = await client.getDataset(ctx.input.datasetToken);
      let dataset = normalizeDataset(existing);
      await client.deleteDataset(ctx.input.datasetToken);
      return {
        output: dataset,
        message: `Deleted dataset **${dataset.name}**.`
      };
    }

    // update
    let raw = await client.updateDataset(ctx.input.datasetToken, {
      name: ctx.input.name,
      description: ctx.input.description,
      spaceToken: ctx.input.collectionToken
    });
    let dataset = normalizeDataset(raw);
    return {
      output: dataset,
      message: `Updated dataset **${dataset.name}**.`
    };
  })
  .build();
