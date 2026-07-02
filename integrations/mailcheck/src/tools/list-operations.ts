import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let operationSummarySchema = z.object({
  operationName: z.string().describe('Unique name of the batch operation'),
  done: z.boolean().describe('Whether the operation has completed'),
  totalCount: z.number().optional().describe('Total number of emails in the batch'),
  processedCount: z.number().optional().describe('Number of emails processed so far'),
  freeLimitReached: z.boolean().optional().describe('Whether the free tier limit was reached'),
  createTime: z.string().optional().describe('Timestamp when the operation was created'),
  resultUrl: z.string().optional().describe('Download URL for results when complete'),
  errorCode: z.number().optional().describe('Error code if the operation failed'),
  errorMessage: z.string().optional().describe('Error message if the operation failed')
});

export let listOperations = SlateTool.create(spec, {
  name: 'List Batch Operations',
  key: 'list_operations',
  description: `List all batch email verification operations for the current account. Returns operation names, statuses, progress, and result download URLs for completed operations.

Supports pagination for accounts with many operations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageSize: z.number().optional().describe('Number of operations to return per page'),
      pageToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous response to fetch the next page')
    })
  )
  .output(
    z.object({
      operations: z.array(operationSummarySchema).describe('List of batch operations'),
      nextPageToken: z.string().optional().describe('Token to fetch the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.listOperations({
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let operations = (response.operations ?? []).map(op => ({
      operationName: op.name,
      done: op.done,
      totalCount: op.metadata?.totalCount,
      processedCount: op.metadata?.processedCount,
      freeLimitReached: op.metadata?.freeLimitReached,
      createTime: op.metadata?.createTime,
      resultUrl: op.result?.response?.url,
      errorCode: op.result?.code,
      errorMessage: op.result?.message
    }));

    let completedCount = operations.filter(op => op.done).length;
    let processingCount = operations.length - completedCount;

    return {
      output: {
        operations,
        nextPageToken: response.nextPageToken
      },
      message: `Found **${operations.length}** batch operations (**${completedCount}** completed, **${processingCount}** processing).${response.nextPageToken ? ' More results available with pagination.' : ''}`
    };
  })
  .build();
