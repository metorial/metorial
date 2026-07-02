import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMailbox = SlateTool.create(spec, {
  name: 'Get Mailbox',
  key: 'get_mailbox',
  description: `Retrieve details of a specific mailbox by its ID. Returns full mailbox configuration including name, email address, parsing settings, and table fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mailboxId: z.string().describe('ID of the mailbox to retrieve')
    })
  )
  .output(
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
        .describe('Whether the mailbox auto-collects email addresses'),
      alertEmailH: z.number().optional().describe('Alert frequency in hours'),
      tableFields: z
        .array(z.any())
        .optional()
        .describe('Table fields configured on the mailbox')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let mb = await client.getMailbox(ctx.input.mailboxId);

    let tableFields: any[] = [];
    try {
      tableFields = await client.getTableFields(ctx.input.mailboxId);
    } catch {
      // Table fields may not be available
    }

    return {
      output: {
        mailboxId: mb._id || mb.id,
        name: mb.name,
        email: mb.email,
        processAttachments: mb.process_attachments,
        collectEmails: mb.collect_emails,
        alertEmailH: mb.alert_email_h,
        tableFields: Array.isArray(tableFields) ? tableFields : []
      },
      message: `Retrieved mailbox **${mb.name || mb._id || mb.id}**.`
    };
  })
  .build();
