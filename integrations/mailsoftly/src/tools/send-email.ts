import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailsoftlyClient } from '../lib/client';
import { spec } from '../spec';

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Sends an existing email draft in Mailsoftly. The email must already be in a "ready" state before it can be sent. Use **Get Email Campaigns** to check draft readiness first.`,
  instructions: ['Ensure the email draft is marked as ready before sending.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      emailId: z.string().describe('ID of the email draft to send.')
    })
  )
  .output(
    z.object({
      sendResult: z.any().describe('Result of the send operation.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailsoftlyClient({ token: ctx.auth.token });

    let sendResult = await client.sendEmail(ctx.input.emailId);

    return {
      output: { sendResult },
      message: `Email draft **${ctx.input.emailId}** has been sent.`
    };
  })
  .build();
