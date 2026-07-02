import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deactivateSubscriber = SlateTool.create(spec, {
  name: 'Deactivate Subscriber',
  key: 'deactivate_subscriber',
  description: `Unsubscribe (deactivate) a subscriber, preventing further email communications. The subscriber record is preserved but marked as inactive. Use **Activate Subscriber** to reactivate later if needed.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the subscriber to deactivate')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      statusCode: z.string().describe('Response status code'),
      message: z.string().optional().describe('Response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.unsubscribeSubscriber(ctx.input.email);

    return {
      output: {
        status: result.Result?.Status ?? 'Unknown',
        statusCode: result.Result?.StatusCode ?? 'Unknown',
        message: result.Result?.Message ?? result.Result?.ErrorMessage
      },
      message: `Deactivated subscriber **${ctx.input.email}**.`
    };
  })
  .build();
