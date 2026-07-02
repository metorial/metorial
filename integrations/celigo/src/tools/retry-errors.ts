import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let retryErrors = SlateTool.create(spec, {
  name: 'Retry Errors',
  key: 'retry_errors',
  description: `Retry one or more flow errors. Provide the retryDataKeys from the error objects returned by the Get Flow Errors tool.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      flowId: z.string().describe('ID of the flow'),
      processorId: z.string().describe('ID of the export or import step'),
      retryDataKeys: z
        .array(z.string())
        .describe('List of retryDataKey values from the error objects to retry')
    })
  )
  .output(
    z.object({
      retried: z.boolean().describe('Whether the retry was successfully initiated'),
      rawResult: z.any().optional().describe('API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.retryErrors(
      ctx.input.flowId,
      ctx.input.processorId,
      ctx.input.retryDataKeys
    );

    return {
      output: {
        retried: true,
        rawResult: result
      },
      message: `Retried **${ctx.input.retryDataKeys.length}** error(s) for flow **${ctx.input.flowId}** / processor **${ctx.input.processorId}**.`
    };
  })
  .build();
