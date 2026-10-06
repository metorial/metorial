import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { accountIdInput, idempotencyInput } from '../lib/models';
import { spec } from '../spec';

export let ingestData = SlateTool.create(spec, {
  name: 'Ingest Data',
  key: 'ingest_data',
  description: `Pushes a batch of data records into a Databox dataset. Each record is a JSON object whose keys match the dataset's columns. Supports real-time and event-based updates.`,
  tags: { destructive: true },
  instructions: [
    'Records must contain JSON-compatible values and finite numbers. Use ISO 8601 strings with an explicit timezone for datetime columns; values are not coerced or converted into legacy metric timestamps.',
    'Include a datetime column (e.g. "occurredAt") for time-based metrics and date range selection in Databox.'
  ],
  constraints: [
    'v1: maximum 100 records per request. v2: maximum 500 records or 10 MB per request.',
    'Ingestion may overwrite primary-key matches and create history. Request acceptance is not row-level success; poll get_ingestion_status and independently read the dataset.'
  ]
})
  .input(
    z.object({
      accountId: accountIdInput,
      idempotencyKey: idempotencyInput,
      datasetId: z
        .string()
        .describe(
          'Identifier of the dataset (v1 UUID or v2 decimal ID encoded as text) to ingest data into'
        ),
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
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });
    let result = await client.ingestData(ctx.input.datasetId, ctx.input.records, {
      accountId: ctx.input.accountId,
      idempotencyKey: ctx.input.idempotencyKey
    });

    return {
      output: {
        ingestionId: result.ingestionId,
        status: result.status,
        message: result.message
      },
      message: `Submitted **${ctx.input.records.length}** record(s) for processing in dataset **${ctx.input.datasetId}**. Verify ingestion **${result.ingestionId}** before treating rows as stored.`
    };
  })
  .build();
