import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppClient } from '../lib/client';
import { spec } from '../spec';

export let getTransactionalMessage = SlateTool.create(spec, {
  name: 'Get Transactional Message',
  key: 'get_transactional_message',
  description:
    'Retrieve a Customer.io transactional message definition by ID or trigger name.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      transactionalMessageId: z
        .union([z.string(), z.number()])
        .describe('The transactional message ID or trigger name')
    })
  )
  .output(
    z.object({
      message: z
        .record(z.string(), z.unknown())
        .describe('The transactional message definition')
    })
  )
  .handleInvocation(async ctx => {
    let appClient = new AppClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await appClient.getTransactionalMessage(ctx.input.transactionalMessageId);
    let message = result?.message ?? result;

    return {
      output: { message },
      message: `Retrieved transactional message **${message?.name ?? ctx.input.transactionalMessageId}**.`
    };
  })
  .build();
