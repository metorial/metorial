import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppClient } from '../lib/client';
import { spec } from '../spec';

export let getMessage = SlateTool.create(spec, {
  name: 'Get Message',
  key: 'get_message',
  description:
    'Retrieve a specific Customer.io delivery record by message ID, including recipient, parent campaign/broadcast/transactional IDs, metrics, and failure information.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      messageId: z.string().describe('The Customer.io delivery/message ID')
    })
  )
  .output(
    z.object({
      message: z.record(z.string(), z.unknown()).describe('The message delivery record')
    })
  )
  .handleInvocation(async ctx => {
    let appClient = new AppClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await appClient.getMessage(ctx.input.messageId);
    let message = result?.message ?? result;

    return {
      output: { message },
      message: `Retrieved message **${ctx.input.messageId}**.`
    };
  })
  .build();
