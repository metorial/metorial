import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteSubscriber = SlateTool.create(spec, {
  name: 'Delete Subscriber',
  key: 'delete_subscriber',
  description: `Permanently delete a subscriber from Enginemailer. This action cannot be undone. Use **Deactivate Subscriber** instead if you want to preserve the subscriber record.`,
  constraints: ['This action is permanent and cannot be reversed.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the subscriber to permanently delete')
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

    let result = await client.deleteSubscriber(ctx.input.email);

    return {
      output: {
        status: result.Result?.Status ?? 'Unknown',
        statusCode: result.Result?.StatusCode ?? 'Unknown',
        message: result.Result?.Message ?? result.Result?.ErrorMessage
      },
      message: `Permanently deleted subscriber **${ctx.input.email}**.`
    };
  })
  .build();
