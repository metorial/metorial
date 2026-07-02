import { SlateTool } from 'slates';
import { z } from 'zod';
import { FormdeskClient } from '../lib/client';
import { spec } from '../spec';

export let markResultProcessed = SlateTool.create(spec, {
  name: 'Mark Result Processed',
  key: 'mark_result_processed',
  description: `Marks a form result entry as "processed" to track synchronization state. This enables incremental sync workflows where you can later query only unprocessed results to avoid reprocessing.`
})
  .input(
    z.object({
      resultId: z.string().describe('The unique ID of the result entry to mark as processed')
    })
  )
  .output(
    z.object({
      resultId: z.string().describe('The ID of the result entry marked as processed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormdeskClient({
      token: ctx.auth.token,
      host: ctx.auth.host,
      domain: ctx.auth.domain
    });

    ctx.progress('Marking result as processed...');
    await client.markResultProcessed(ctx.input.resultId);

    return {
      output: {
        resultId: ctx.input.resultId
      },
      message: `Result **${ctx.input.resultId}** marked as processed.`
    };
  })
  .build();
