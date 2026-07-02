import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppClient } from '../lib/client';
import { spec } from '../spec';

export let listTransactionalMessages = SlateTool.create(spec, {
  name: 'List Transactional Messages',
  key: 'list_transactional_messages',
  description:
    'List transactional message definitions in Customer.io so you can discover message IDs and trigger names before sending transactional messages.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      messages: z
        .array(
          z.object({
            transactionalMessageId: z.number().describe('The transactional message ID'),
            name: z.string().optional().describe('The transactional message name'),
            description: z.string().optional(),
            sendToUnsubscribed: z.boolean().optional(),
            queueDrafts: z.boolean().optional(),
            createdAt: z.number().optional(),
            updatedAt: z.number().optional()
          })
        )
        .describe('Transactional message definitions')
    })
  )
  .handleInvocation(async ctx => {
    let appClient = new AppClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await appClient.listTransactionalMessages();
    let messages = (result?.messages ?? []).map((message: any) => ({
      transactionalMessageId: message.id,
      name: message.name,
      description: message.description,
      sendToUnsubscribed: message.send_to_unsubscribed,
      queueDrafts: message.queue_drafts,
      createdAt: message.created_at,
      updatedAt: message.updated_at
    }));

    return {
      output: { messages },
      message: `Found **${messages.length}** transactional messages.`
    };
  })
  .build();
