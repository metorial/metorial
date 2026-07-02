import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBatchOperation = SlateTool.create(spec, {
  name: 'Get Batch Operation',
  key: 'get_batch_operation',
  description: `Retrieve the status and results of a batch email verification operation. Use the operation name returned by the **Create Batch Check** tool.

When the operation is complete, a download URL for the results file is included in the response.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      operationName: z.string().describe('The name of the batch operation to check')
    })
  )
  .output(
    z.object({
      operationName: z.string().describe('Name of the batch operation'),
      done: z.boolean().describe('Whether the batch operation has completed'),
      totalCount: z.number().optional().describe('Total number of emails in the batch'),
      processedCount: z.number().optional().describe('Number of emails processed so far'),
      freeLimitReached: z
        .boolean()
        .optional()
        .describe('Whether the free tier verification limit has been reached'),
      createTime: z.string().optional().describe('Timestamp when the operation was created'),
      resultUrl: z
        .string()
        .optional()
        .describe('Download URL for results file when the operation is complete'),
      errorCode: z.number().optional().describe('Error code if the operation failed'),
      errorMessage: z.string().optional().describe('Error message if the operation failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let operation = await client.getOperationStatus(ctx.input.operationName);

    let statusText = operation.done ? 'completed' : 'processing';
    let progressText = operation.metadata?.totalCount
      ? ` (${operation.metadata.processedCount ?? 0}/${operation.metadata.totalCount} emails processed)`
      : '';

    return {
      output: {
        operationName: operation.name,
        done: operation.done,
        totalCount: operation.metadata?.totalCount,
        processedCount: operation.metadata?.processedCount,
        freeLimitReached: operation.metadata?.freeLimitReached,
        createTime: operation.metadata?.createTime,
        resultUrl: operation.result?.response?.url,
        errorCode: operation.result?.code,
        errorMessage: operation.result?.message
      },
      message: `Operation **${operation.name}** is **${statusText}**${progressText}.${operation.result?.response?.url ? ` Results available at: ${operation.result.response.url}` : ''}${operation.result?.message ? ` Error: ${operation.result.message}` : ''}`
    };
  })
  .build();
