import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDatasetRecord = SlateTool.create(spec, {
  name: 'Get Dataset Record',
  key: 'get_dataset_record',
  description: `Retrieves a single record from a Census dataset by its primary key. Datasets make warehouse data accessible via API. Can also list all available datasets when no datasetId is provided.`,
  constraints: ['Available only on the Census Enterprise Plan.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      datasetId: z
        .number()
        .optional()
        .describe('ID of the dataset to query. Omit to list all available datasets.'),
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
            name: z.string().describe('Dataset name.'),
            libraryId: z.number().describe('Library ID the dataset belongs to.')
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
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (!ctx.input.datasetId) {
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
      throw new Error('recordId is required when datasetId is provided.');
    }

    let record = await client.getDatasetRecord(ctx.input.datasetId, ctx.input.recordId);

    return {
      output: { record },
      message: `Retrieved record **${ctx.input.recordId}** from dataset ${ctx.input.datasetId}.`
    };
  })
  .build();
