import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { accountIdInput, pageInput, pageSizeInput } from '../lib/models';
import { spec } from '../spec';

export let listIngestions = SlateTool.create(spec, {
  name: 'List Ingestions',
  key: 'list_ingestions',
  description: `Lists ingestion events for a dataset with pagination. Use this to review the history of data pushes and track ingestion activity over time.`,
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
          'Identifier of the dataset (v1 UUID or v2 decimal ID encoded as text) to list ingestions for'
        ),
      page: pageInput,
      pageSize: pageSizeInput
    })
  )
  .output(
    z.object({
      ingestions: z
        .array(
          z.object({
            ingestionId: z.string().describe('Unique ingestion event identifier'),
            timestamp: z.string().describe('ISO 8601 timestamp of the ingestion event'),
            status: z.string().optional().describe('Provider processing status when available')
          })
        )
        .describe('List of ingestion events'),
      currentPage: z.number().describe('Current page number'),
      pageSize: z.number().describe('Number of results per page'),
      totalItems: z.number().describe('Total number of ingestion events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });
    let result = await client.listIngestions(ctx.input.datasetId, {
      accountId: ctx.input.accountId,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        ingestions: result.ingestions.map(i => ({
          ingestionId: i.ingestionId,
          timestamp: i.timestamp,
          status: i.status
        })),
        currentPage: result.pagination.page,
        pageSize: result.pagination.pageSize,
        totalItems: result.pagination.totalItems
      },
      message: `Found **${result.pagination.totalItems}** ingestion event(s) for dataset **${ctx.input.datasetId}** (page ${result.pagination.page}).`
    };
  })
  .build();
