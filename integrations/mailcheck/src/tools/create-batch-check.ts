import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createBatchCheck = SlateTool.create(spec, {
  name: 'Create Batch Check',
  key: 'create_batch_check',
  description: `Submit a list of email addresses for batch verification. Returns an operation that can be polled for completion using the **Get Batch Operation** tool.

Once the operation completes, use **Get Batch Operation** to retrieve the verification results file.`
})
  .input(
    z.object({
      emails: z.array(z.string()).describe('List of email addresses to verify in batch')
    })
  )
  .output(
    z.object({
      operationName: z
        .string()
        .describe(
          'Unique name identifying this batch operation. Use this to check status later.'
        ),
      done: z.boolean().describe('Whether the batch operation has completed'),
      totalCount: z.number().optional().describe('Total number of emails submitted'),
      processedCount: z.number().optional().describe('Number of emails processed so far'),
      createTime: z.string().optional().describe('Timestamp when the operation was created')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.emails.length === 0) {
      throw createApiServiceError(
        'Provide at least one email address for batch verification.'
      );
    }

    let client = new Client({ token: ctx.auth.token });
    let operation = await client.createBatchCheck(ctx.input.emails);

    return {
      output: {
        operationName: operation.name,
        done: operation.done ?? false,
        totalCount: operation.metadata?.totalCount,
        processedCount: operation.metadata?.processedCount,
        createTime: operation.metadata?.createTime
      },
      message: `Batch verification operation **${operation.name}** created with **${ctx.input.emails.length}** emails. Status: ${operation.done ? 'completed' : 'processing'}.`
    };
  })
  .build();
