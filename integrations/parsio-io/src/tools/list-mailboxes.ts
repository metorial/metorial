import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMailboxes = SlateTool.create(spec, {
  name: 'List Mailboxes',
  key: 'list_mailboxes',
  description: `List all mailboxes in your Parsio.io account. Each mailbox has a unique email address where documents can be forwarded for parsing. Returns mailbox details including name, email address, and configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      mailboxes: z
        .array(
          z.object({
            mailboxId: z.string().describe('Unique identifier of the mailbox'),
            name: z.string().optional().describe('Name of the mailbox'),
            email: z.string().optional().describe('Email address of the mailbox'),
            processAttachments: z
              .boolean()
              .optional()
              .describe('Whether the mailbox processes attachments'),
            collectEmails: z
              .boolean()
              .optional()
              .describe('Whether the mailbox auto-collects email addresses')
          })
        )
        .describe('List of mailboxes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let mailboxes = await client.listMailboxes();

    let mapped = (Array.isArray(mailboxes) ? mailboxes : []).map((mb: any) => ({
      mailboxId: mb._id || mb.id,
      name: mb.name,
      email: mb.email,
      processAttachments: mb.process_attachments,
      collectEmails: mb.collect_emails
    }));

    return {
      output: { mailboxes: mapped },
      message: `Found **${mapped.length}** mailbox(es).`
    };
  })
  .build();
