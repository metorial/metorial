import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getIngestionStatus = SlateTool.create(spec, {
  name: 'Get Ingestion Status',
  key: 'get_ingestion_status',
  description: `Retrieves details about a specific data ingestion event, including processing metrics such as total rows, valid rows, and invalid rows. Use this to verify whether ingested data was processed successfully.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('UUID of the dataset the ingestion belongs to'),
      ingestionId: z.string().describe('UUID of the ingestion event to retrieve details for')
    })
  )
  .output(
    z.object({
      ingestionId: z.string().describe('Unique ingestion event identifier'),
      timestamp: z.string().describe('ISO 8601 timestamp of the ingestion event'),
      totalRows: z.number().optional().describe('Total number of rows submitted'),
      validRows: z.number().optional().describe('Number of rows that passed validation'),
      invalidRows: z.number().optional().describe('Number of rows that failed validation'),
      datasetMetrics: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Summary of dataset characteristics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getIngestionDetails(ctx.input.datasetId, ctx.input.ingestionId);

    let ingestionMetrics = result.metrics?.ingestionMetrics;

    return {
      output: {
        ingestionId: result.ingestionId,
        timestamp: result.timestamp,
        totalRows: ingestionMetrics?.totalRows,
        validRows: ingestionMetrics?.validRows,
        invalidRows: ingestionMetrics?.invalidRows,
        datasetMetrics: result.metrics?.datasetMetrics as Record<string, unknown> | undefined
      },
      message: `Ingestion **${result.ingestionId}**: ${ingestionMetrics?.validRows ?? '?'}/${ingestionMetrics?.totalRows ?? '?'} rows processed successfully.`
    };
  })
  .build();
