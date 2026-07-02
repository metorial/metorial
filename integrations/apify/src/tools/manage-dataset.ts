import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';
import {
  ensureAtLeastOne,
  mapDataset,
  paginationInput,
  pickDefined,
  requireString
} from './shared';

export let manageDataset = SlateTool.create(spec, {
  name: 'Manage Dataset',
  key: 'manage_dataset',
  description: `List, get, create, update, or delete Apify datasets. Use Get Dataset Items to read or export the items inside a dataset.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      datasetId: z.string().optional().describe('Dataset ID for get/update/delete'),
      name: z.string().optional().describe('Dataset name for create/update'),
      unnamed: z.boolean().optional().describe('Include unnamed datasets in list'),
      ...paginationInput
    })
  )
  .output(
    z.object({
      datasetId: z.string().optional(),
      name: z.string().optional(),
      itemCount: z.number().optional(),
      cleanItemCount: z.number().optional(),
      createdAt: z.string().optional(),
      modifiedAt: z.string().optional(),
      accessedAt: z.string().optional(),
      datasets: z.array(z.record(z.string(), z.any())).optional(),
      total: z.number().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listDatasets({
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        desc: ctx.input.descending,
        unnamed: ctx.input.unnamed
      });
      let datasets = result.items.map(mapDataset);
      return {
        output: { datasets, total: result.total },
        message: `Found **${result.total}** dataset(s), showing **${datasets.length}**.`
      };
    }

    if (ctx.input.action === 'get') {
      let datasetId = requireString(ctx.input.datasetId, 'datasetId', 'get');
      let dataset = await client.getDataset(datasetId);
      return {
        output: mapDataset(dataset),
        message: `Retrieved dataset \`${dataset.id ?? datasetId}\`.`
      };
    }

    if (ctx.input.action === 'create') {
      let dataset = await client.createDataset({ name: ctx.input.name });
      return {
        output: mapDataset(dataset),
        message: `Created dataset \`${dataset.id}\`.`
      };
    }

    if (ctx.input.action === 'update') {
      let datasetId = requireString(ctx.input.datasetId, 'datasetId', 'update');
      let body = pickDefined({ name: ctx.input.name });
      ensureAtLeastOne(body, 'update the dataset');
      let dataset = await client.updateDataset(datasetId, body);
      return {
        output: mapDataset(dataset),
        message: `Updated dataset \`${dataset.id ?? datasetId}\`.`
      };
    }

    let datasetId = requireString(ctx.input.datasetId, 'datasetId', 'delete');
    await client.deleteDataset(datasetId);
    return {
      output: { datasetId, deleted: true },
      message: `Deleted dataset \`${datasetId}\`.`
    };
  })
  .build();
