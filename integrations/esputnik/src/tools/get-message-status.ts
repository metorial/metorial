import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMessageStatus = SlateTool.create(spec, {
  name: 'Get Message Status',
  key: 'get_message_status',
  description: `Check the delivery status of one or more sent messages using request IDs obtained from the Send Prepared Message tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      requestIds: z
        .array(z.string())
        .min(1)
        .describe('Request IDs from Send Prepared Message responses')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            requestId: z.string().describe('The request ID'),
            status: z.string().describe('Delivery status'),
            delivered: z.string().optional().describe('Whether the message was delivered'),
            failed: z.string().optional().describe('Whether the message delivery failed')
          })
        )
        .describe('Status results for each request ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getMessageStatus(ctx.input.requestIds);

    let results = Array.isArray(result.results)
      ? result.results
      : [result.results].filter(Boolean);

    return {
      output: { results },
      message: `Retrieved status for **${results.length}** message(s).`
    };
  })
  .build();
