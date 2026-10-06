import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { workspaceClient } from '../lib/client';
import { workspaceId } from '../lib/schemas';
import { spec } from '../spec';

export let getDatasetRecord = SlateTool.create(spec, {
  name: 'Get Dataset Record',
  key: 'get_dataset_record',
  description: `Retrieves a single record from a Census dataset by its primary key. Datasets make warehouse data accessible via API. Can also list the available legacy datasets returned by the provider when no datasetId is provided.`,
  constraints: [
    'Legacy record-access routes are absent from the current public API reference. Availability must be confirmed for your workspace; list_datasets returns current SQL metadata and does not replace record lookup.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId,
      datasetId: z
        .number()
        .optional()
        .describe(
          'ID of the dataset to query. Omit to list the available legacy datasets returned by the provider.'
        ),
      recordId: z
        .string()
        .optional()
        .describe(
          'Primary key of the record to retrieve. Required when datasetId is provided.'
        )
    })
  )
  .output(
    z.object({
      datasets: z
        .array(
          z.object({
            datasetId: z.number().describe('Dataset ID.'),
            name: z.string().optional().describe('Dataset name.'),
            libraryId: z.number().optional().describe('Library ID the dataset belongs to.')
          })
        )
        .optional()
        .describe('Available datasets (returned when no datasetId is specified).'),
      record: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('The retrieved record fields and values.')
    })
  )
  .handleInvocation(async ctx => {
    let client = await workspaceClient(ctx);

    if (ctx.input.datasetId === undefined) {
      if (ctx.input.recordId !== undefined)
        throw createApiServiceError('datasetId is required with recordId.');
      let datasets = await client.listDatasets();
      let mapped = datasets.map(d => ({
        datasetId: d.id,
        name: d.name,
        libraryId: d.libraryId
      }));
      return {
        output: { datasets: mapped },
        message: `Found **${mapped.length}** dataset(s).`
      };
    }

    if (!ctx.input.recordId) {
      throw createApiServiceError('recordId is required when datasetId is provided.');
    }

    let record = await client.getDatasetRecord(ctx.input.datasetId, ctx.input.recordId);

    return {
      output: { record },
      message: `Retrieved record **${ctx.input.recordId}** from dataset ${ctx.input.datasetId}.`
    };
  })
  .build();
