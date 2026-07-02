import { SlateTool } from 'slates';
import { z } from 'zod';
import { CohereClient } from '../lib/client';
import { spec } from '../spec';

let datasetOutputSchema = z.object({
  datasetId: z.string().describe('Unique identifier of the dataset'),
  name: z.string().describe('Name of the dataset'),
  datasetType: z.string().optional().describe('Type of the dataset (e.g., embed-input)'),
  validationStatus: z.string().optional().describe('Current validation status'),
  createdAt: z.string().optional().describe('ISO 8601 timestamp of creation'),
  updatedAt: z.string().optional().describe('ISO 8601 timestamp of last update')
});

export let listDatasetsTool = SlateTool.create(spec, {
  name: 'List Datasets',
  key: 'list_datasets',
  description: `List datasets stored in your Cohere account. Datasets are used for batch embedding jobs and can be filtered by type, date, and validation status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      datasetType: z
        .string()
        .optional()
        .describe('Filter by dataset type (e.g., "embed-input")'),
      before: z
        .string()
        .optional()
        .describe('Only return datasets created before this ISO 8601 date'),
      after: z
        .string()
        .optional()
        .describe('Only return datasets created after this ISO 8601 date'),
      limit: z.number().optional().describe('Maximum number of datasets to return'),
      offset: z.number().optional().describe('Number of datasets to skip for pagination'),
      validationStatus: z
        .string()
        .optional()
        .describe('Filter by validation status (e.g., "validated")')
    })
  )
  .output(
    z.object({
      datasets: z.array(datasetOutputSchema).describe('List of datasets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CohereClient({ token: ctx.auth.token });

    let result = await client.listDatasets({
      datasetType: ctx.input.datasetType,
      before: ctx.input.before,
      after: ctx.input.after,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      validationStatus: ctx.input.validationStatus
    });

    let datasets = (result.datasets || []).map((d: any) => ({
      datasetId: d.id || '',
      name: d.name || '',
      datasetType: d.dataset_type,
      validationStatus: d.validation_status,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }));

    return {
      output: { datasets },
      message: `Found **${datasets.length}** dataset(s).`
    };
  })
  .build();

export let getDatasetTool = SlateTool.create(spec, {
  name: 'Get Dataset',
  key: 'get_dataset',
  description: `Retrieve details about a specific dataset by its ID, including its type, validation status, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('ID of the dataset to retrieve')
    })
  )
  .output(datasetOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CohereClient({ token: ctx.auth.token });

    let result = await client.getDataset(ctx.input.datasetId);
    let d = result.dataset || result;

    return {
      output: {
        datasetId: d.id || '',
        name: d.name || '',
        datasetType: d.dataset_type,
        validationStatus: d.validation_status,
        createdAt: d.created_at,
        updatedAt: d.updated_at
      },
      message: `Retrieved dataset **${d.name || ctx.input.datasetId}** (status: ${d.validation_status || 'unknown'}).`
    };
  })
  .build();

export let deleteDatasetTool = SlateTool.create(spec, {
  name: 'Delete Dataset',
  key: 'delete_dataset',
  description: `Delete a dataset from your Cohere account by its ID. Datasets are automatically deleted after 30 days, but this allows immediate removal.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('ID of the dataset to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the dataset was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CohereClient({ token: ctx.auth.token });

    await client.deleteDataset(ctx.input.datasetId);

    return {
      output: { deleted: true },
      message: `Deleted dataset **${ctx.input.datasetId}**.`
    };
  })
  .build();
