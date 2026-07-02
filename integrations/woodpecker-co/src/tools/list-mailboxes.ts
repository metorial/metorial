import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMailboxes = SlateTool.create(spec, {
  name: 'List Mailboxes',
  key: 'list_mailboxes',
  description: `Retrieve all connected email accounts (SMTP mailboxes) in the Woodpecker account. Returns mailbox IDs, email addresses, and connection status. Use the mailbox IDs when creating campaigns to specify which accounts to send from.`,
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
            mailboxId: z.number().describe('Mailbox ID'),
            email: z.string().describe('Email address'),
            name: z.string().optional().describe('Display name'),
            status: z.string().optional().describe('Connection status'),
            dailyLimit: z.number().optional().describe('Daily sending limit')
          })
        )
        .describe('List of connected mailboxes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let data: any = await client.listMailboxes();
    let mailboxes: any[] = Array.isArray(data) ? data : (data?.mailboxes ?? []);

    let mapped = mailboxes.map((m: any) => ({
      mailboxId: m.id,
      email: m.email ?? '',
      name: m.name,
      status: m.status,
      dailyLimit: m.daily_limit ?? m.dailyLimit
    }));

    return {
      output: { mailboxes: mapped },
      message: `Found **${mapped.length}** mailbox(es).`
    };
  })
  .build();
