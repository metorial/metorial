import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, emailAddresses } from '../lib/client';
import { spec } from '../spec';

export let getEmail = SlateTool.create(spec, {
  name: 'Get Email',
  key: 'get_email',
  description:
    'Read a single inbox email and its message/thread identifiers. Requires emails:read or an equivalent broader scope. Does not send a reply or mark the thread read.',
  tags: { readOnly: true }
})
  .input(z.object({ emailId: z.string().describe('Email ID returned by list_emails.') }))
  .output(
    z.object({
      emailId: z.string(),
      subject: z.string(),
      fromAddress: z.string().optional(),
      toAddresses: z.array(z.string()).optional(),
      body: z.object({ text: z.string().optional(), html: z.string().optional() }),
      sendingAccount: z.string(),
      threadId: z.string().optional(),
      campaignId: z.string().optional(),
      leadEmail: z.string().optional(),
      timestampEmail: z.string().optional(),
      timestampCreated: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let email = await new Client(ctx.auth).getEmail(ctx.input.emailId);
    return {
      output: {
        emailId: email.id,
        subject: email.subject,
        fromAddress: email.from_address_email ?? undefined,
        toAddresses: emailAddresses(email.to_address_email_list),
        body: { text: email.body?.text ?? undefined, html: email.body?.html ?? undefined },
        sendingAccount: email.eaccount,
        threadId: email.thread_id ?? undefined,
        campaignId: email.campaign_id ?? undefined,
        leadEmail: email.lead ?? undefined,
        timestampEmail: email.timestamp_email,
        timestampCreated: email.timestamp_created
      },
      message: 'Read the inbox email.'
    };
  })
  .build();
