import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDataset = SlateTool.create(spec, {
  name: 'Create Dataset',
  key: 'create_dataset',
  description: `Creates a new dataset within a data source. Datasets are containers for row-level data. You can optionally define primary keys to control how rows are uniquely identified and updated during ingestion.`,
  instructions: [
    'A data source must exist before creating a dataset. Use **Create Data Source** first if needed.',
    'Primary keys are optional — when specified, they determine how duplicate rows are handled during ingestion.'
  ],
  constraints: ['Maximum 100 columns per dataset.', 'Maximum 200MB total dataset size.']
})
  .input(
    z.object({
      dataSourceId: z.number().describe('ID of the parent data source'),
      title: z.string().describe('Human-readable name for the dataset'),
      primaryKeys: z
        .array(z.string())
        .optional()
        .describe(
          'Column names used to uniquely identify rows. Omit if no deduplication is needed'
        )
    })
  )
  .output(
    z.object({
      datasetId: z.string().describe('Unique dataset identifier (UUID)'),
      title: z.string().describe('Dataset title'),
      created: z.string().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createDataset({
      dataSourceId: ctx.input.dataSourceId,
      title: ctx.input.title,
      primaryKeys: ctx.input.primaryKeys
    });

    return {
      output: {
        datasetId: result.id,
        title: result.title,
        created: result.created
      },
      message: `Created dataset **"${result.title}"** (ID: ${result.id}) in data source **${ctx.input.dataSourceId}**.`
    };
  })
  .build();
