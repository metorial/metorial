import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnowflakeClient } from '../lib/client';
import { spec } from '../spec';

export let cancelStatement = SlateTool.create(spec, {
  name: 'Cancel Statement',
  key: 'cancel_statement',
  description: `Cancel a running or queued SQL statement. Provide the statement handle from a previous execution to stop it.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      statementHandle: z
        .string()
        .describe('Statement handle of the running statement to cancel')
    })
  )
  .output(
    z.object({
      statementHandle: z.string().describe('Handle of the cancelled statement'),
      status: z.string().describe('Cancellation result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnowflakeClient({
      accountIdentifier: ctx.config.accountIdentifier,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let result = await client.cancelStatement(ctx.input.statementHandle);

    return {
      output: {
        statementHandle: ctx.input.statementHandle,
        status: result.message || 'Statement cancelled successfully'
      },
      message: `Cancelled statement \`${ctx.input.statementHandle}\``
    };
  })
  .build();
