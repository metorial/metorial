import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppClient } from '../lib/client';
import { spec } from '../spec';

export let listMessages = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description:
    'List recent Customer.io delivery records for troubleshooting sends, broadcasts, campaigns, and transactional messages.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      messages: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Customer.io message delivery records')
    })
  )
  .handleInvocation(async ctx => {
    let appClient = new AppClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await appClient.listMessages();
    let messages = result?.messages ?? [];

    return {
      output: { messages },
      message: `Found **${messages.length}** messages.`
    };
  })
  .build();
