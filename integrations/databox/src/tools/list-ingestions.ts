import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      datasetId: z.string().describe('UUID of the dataset to list ingestions for'),
      page: z.number().optional().describe('Page number (1-indexed). Defaults to 1'),
      pageSize: z.number().optional().describe('Number of results per page. Defaults to 100')
    })
  )
  .output(
    z.object({
      ingestions: z
        .array(
          z.object({
            ingestionId: z.string().describe('Unique ingestion event identifier'),
            timestamp: z.string().describe('ISO 8601 timestamp of the ingestion event')
          })
        )
        .describe('List of ingestion events'),
      currentPage: z.number().describe('Current page number'),
      pageSize: z.number().describe('Number of results per page'),
      totalItems: z.number().describe('Total number of ingestion events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listIngestions(ctx.input.datasetId, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        ingestions: result.ingestions.map(i => ({
          ingestionId: i.ingestionId,
          timestamp: i.timestamp
        })),
        currentPage: result.pagination.page,
        pageSize: result.pagination.pageSize,
        totalItems: result.pagination.totalItems
      },
      message: `Found **${result.pagination.totalItems}** ingestion event(s) for dataset **${ctx.input.datasetId}** (page ${result.pagination.page}).`
    };
  })
  .build();
