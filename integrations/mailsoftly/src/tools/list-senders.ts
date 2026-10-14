import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailsoftlyClient } from '../lib/client';
import { spec } from '../spec';

export let listSenders = SlateTool.create(spec, {
  name: 'List Senders',
  key: 'list_senders',
  description:
    "Lists the account's available campaign sender addresses and default sender. Each entry identifies whether create_email_campaign should use senderId or emailSenderId.",
  instructions: [
    'API keys cannot send through a Gmail or Microsoft mailbox owned by a teammate. Check sender authorization with get_email_campaigns before sending.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      senders: z
        .array(z.any())
        .describe(
          'Available senders, including email, name, kind, sender_id or email_sender_id, usable_as, and default status.'
        ),
      defaultSenderId: z
        .number()
        .nullable()
        .optional()
        .describe('Default team member sender ID, when configured.'),
      note: z.string().optional().describe('Provider guidance on choosing a sender.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailsoftlyClient({ token: ctx.auth.token });
    let result = await client.listSenders();
    return {
      output: {
        senders: result.senders,
        defaultSenderId: result.default_sender_id,
        note: result.note
      },
      message: `Retrieved **${result.senders.length}** campaign sender(s).`
    };
  })
  .build();
