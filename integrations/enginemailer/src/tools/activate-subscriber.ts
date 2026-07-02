import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let activateSubscriber = SlateTool.create(spec, {
  name: 'Activate Subscriber',
  key: 'activate_subscriber',
  description: `Reactivate a previously deactivated (unsubscribed) subscriber, allowing them to receive email communications again.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the subscriber to reactivate')
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

    let result = await client.activateSubscriber(ctx.input.email);

    return {
      output: {
        status: result.Result?.Status ?? 'Unknown',
        statusCode: result.Result?.StatusCode ?? 'Unknown',
        message: result.Result?.Message ?? result.Result?.ErrorMessage
      },
      message: `Activated subscriber **${ctx.input.email}**.`
    };
  })
  .build();
