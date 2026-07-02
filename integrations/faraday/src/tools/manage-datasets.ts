import { SlateTool } from 'slates';
import { z } from 'zod';
import { FaradayClient } from '../lib/client';
import { spec } from '../spec';

let datasetSchema = z.object({
  datasetId: z.string().describe('Unique identifier of the dataset'),
  name: z.string().describe('Human-readable name of the dataset'),
  status: z
    .string()
    .optional()
    .describe('Current status: new, starting, running, ready, or error'),
  connectionId: z.string().optional().describe('UUID of the connection used by this dataset'),
  createdAt: z.string().optional().describe('Timestamp when the dataset was created'),
  updatedAt: z.string().optional().describe('Timestamp when the dataset was last updated')
});

export let listDatasets = SlateTool.create(spec, {
  name: 'List Datasets',
  key: 'list_datasets',
  description: `Retrieve all datasets in your Faraday account. Datasets define how imported data maps to Faraday's identity model and event streams, and can be connected to external data sources or CSV uploads.`,
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      datasets: z.array(datasetSchema).describe('List of all datasets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    let datasets = await client.listDatasets();

    let mapped = datasets.map((d: any) => ({
      datasetId: d.id,
      name: d.name,
      status: d.status,
      connectionId: d.connection_id,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }));

    return {
      output: { datasets: mapped },
      message: `Found **${mapped.length}** dataset(s).`
    };
  })
  .build();

export let getDataset = SlateTool.create(spec, {
  name: 'Get Dataset',
  key: 'get_dataset',
  description: `Retrieve detailed information about a specific dataset, including its connection, status, and identity mapping configuration.`,
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      datasetId: z.string().describe('UUID of the dataset to retrieve')
    })
  )
  .output(
    datasetSchema.extend({
      identityMapping: z
        .record(z.string(), z.any())
        .optional()
        .describe('How dataset columns map to Faraday identity fields'),
      outputColumns: z.array(z.any()).optional().describe('Available output columns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    let d = await client.getDataset(ctx.input.datasetId);

    return {
      output: {
        datasetId: d.id,
        name: d.name,
        status: d.status,
        connectionId: d.connection_id,
        identityMapping: d.identity_sets,
        outputColumns: d.output_columns,
        createdAt: d.created_at,
        updatedAt: d.updated_at
      },
      message: `Dataset **${d.name}** is **${d.status}**.`
    };
  })
  .build();

export let deleteDataset = SlateTool.create(spec, {
  name: 'Delete Dataset',
  key: 'delete_dataset',
  description: `Permanently delete a dataset. This cannot be undone and may affect dependent streams and cohorts.`,
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      datasetId: z.string().describe('UUID of the dataset to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the dataset was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    await client.deleteDataset(ctx.input.datasetId);

    return {
      output: { deleted: true },
      message: `Deleted dataset **${ctx.input.datasetId}**.`
    };
  })
  .build();
