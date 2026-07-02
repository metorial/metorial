import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCreditsTool = SlateTool.create(spec, {
  name: 'Get Credits',
  key: 'get_credits',
  description: `Check remaining account credits. Each credit equals one page of document processing.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      credits: z.number().describe('Number of remaining credits (1 credit = 1 page)'),
      status: z.string().describe('Request status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.getCredits();

    return {
      output: {
        credits: result.credits,
        status: result.status
      },
      message: `Account has **${result.credits}** credits remaining.`
    };
  })
  .build();
