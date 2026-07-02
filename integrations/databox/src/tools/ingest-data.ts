import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let ingestData = SlateTool.create(spec, {
  name: 'Ingest Data',
  key: 'ingest_data',
  description: `Pushes a batch of data records into a Databox dataset. Each record is a JSON object whose keys match the dataset's columns. Supports real-time and event-based updates.`,
  instructions: [
    'Each record should be a flat JSON object with keys corresponding to dataset columns.',
    'Include a datetime column (e.g. "occurredAt") for time-based metrics and date range selection in Databox.'
  ],
  constraints: ['Maximum **100 records** per ingestion request.']
})
  .input(
    z.object({
      datasetId: z.string().describe('UUID of the dataset to ingest data into'),
      records: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Array of data records to ingest. Each record is a JSON object with column names as keys'
        )
    })
  )
  .output(
    z.object({
      ingestionId: z.string().describe('Unique identifier for this ingestion event'),
      status: z.string().describe('Status of the ingestion request'),
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.ingestData(ctx.input.datasetId, ctx.input.records);

    return {
      output: {
        ingestionId: result.ingestionId,
        status: result.status,
        message: result.message
      },
      message: `Ingested **${ctx.input.records.length}** record(s) into dataset **${ctx.input.datasetId}**. Ingestion ID: \`${result.ingestionId}\`.`
    };
  })
  .build();
