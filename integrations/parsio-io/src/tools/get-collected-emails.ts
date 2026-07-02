import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCollectedEmails = SlateTool.create(spec, {
  name: 'Get Collected Emails',
  key: 'get_collected_emails',
  description: `Retrieve the list of email addresses that have been automatically collected from documents in a mailbox. Requires the "collect emails" setting to be enabled on the mailbox.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mailboxId: z.string().describe('ID of the mailbox to retrieve collected emails from')
    })
  )
  .output(
    z.object({
      emails: z.array(z.any()).describe('List of collected email addresses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCollectedEmails(ctx.input.mailboxId);

    let emails = Array.isArray(result) ? result : result?.emails || [];

    return {
      output: { emails },
      message: `Found **${emails.length}** collected email(s) in mailbox **${ctx.input.mailboxId}**.`
    };
  })
  .build();
