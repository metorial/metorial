import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { recipientSchema } from '../lib/types';
import { spec } from '../spec';

export let listRecipients = SlateTool.create(spec, {
  name: 'List Recipients',
  key: 'list_recipients',
  description: `List all alert recipients (notification channels) configured in your account. Includes email, SMS, webhook, Slack-compatible, and Microsoft Teams recipients.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      recipients: z.array(recipientSchema).describe('List of all alert recipients')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let recipients = await client.listRecipients();

    return {
      output: { recipients },
      message: `Found **${recipients.length}** alert recipient(s).`
    };
  })
  .build();
