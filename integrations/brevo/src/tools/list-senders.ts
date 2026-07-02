import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSenders = SlateTool.create(spec, {
  name: 'List Senders',
  key: 'list_senders',
  description: `Retrieve all configured email senders in your Brevo account. Use this to find valid sender emails before sending transactional emails or creating campaigns.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      senders: z
        .array(
          z.object({
            senderId: z.number().describe('Sender ID'),
            name: z.string().describe('Sender name'),
            email: z.string().describe('Sender email address'),
            active: z.boolean().describe('Whether the sender is active')
          })
        )
        .describe('List of configured senders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.listSenders();

    let senders = (result.senders ?? []).map((s: any) => ({
      senderId: s.id,
      name: s.name,
      email: s.email,
      active: s.active ?? true
    }));

    return {
      output: { senders },
      message: `Retrieved **${senders.length}** senders.`
    };
  });
