import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { accountIdInput, ingestionSummarySchema } from '../lib/models';
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
      accountId: accountIdInput,
      datasetId: z
        .string()
        .describe(
          'Identifier of the dataset (v1 UUID or v2 decimal ID encoded as text) the ingestion belongs to'
        ),
      ingestionId: z.string().describe('UUID of the ingestion event to retrieve details for')
    })
  )
  .output(ingestionSummarySchema)
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });
    const result = await client.getIngestionDetails(
      ctx.input.datasetId,
      ctx.input.ingestionId,
      { accountId: ctx.input.accountId }
    );
    return {
      output: result,
      message: `Retrieved ingestion **${result.ingestionId}**. Check processing status, rejected rows and dataset readback before treating the request as complete.`
    };
  })
  .build();
