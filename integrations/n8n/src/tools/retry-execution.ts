import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let retryExecution = SlateTool.create(spec, {
  name: 'Retry Execution',
  key: 'retry_execution',
  description: `Retry a failed workflow execution. By default, retries using the original workflow version from the failed execution. Set **useCurrentWorkflow** to true to retry with the latest workflow definition instead.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      executionId: z.string().describe('ID of the failed execution to retry'),
      useCurrentWorkflow: z
        .boolean()
        .optional()
        .describe(
          'If true, retry with the current/latest workflow version instead of the original version used during the failed execution'
        )
    })
  )
  .output(
    z.object({
      retried: z.boolean().describe('Whether the retry was initiated'),
      newExecutionId: z
        .string()
        .optional()
        .describe('ID of the new retry execution, if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.retryExecution(
      ctx.input.executionId,
      ctx.input.useCurrentWorkflow
    );

    return {
      output: {
        retried: true,
        newExecutionId: result?.id ? String(result.id) : undefined
      },
      message: `Retried execution **${ctx.input.executionId}**${ctx.input.useCurrentWorkflow ? ' using the latest workflow version' : ' using the original workflow version'}.`
    };
  })
  .build();
