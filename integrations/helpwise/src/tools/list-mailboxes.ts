import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMailboxes = SlateTool.create(spec, {
  name: 'List Mailboxes',
  key: 'list_mailboxes',
  description: `Retrieve all shared mailboxes in your Helpwise account. Returns mailbox details including email addresses, display names, and configuration. Use this to discover available inboxes before performing operations on specific mailboxes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of mailboxes to return'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      mailboxes: z.array(z.record(z.string(), z.any())).describe('List of mailboxes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listMailboxes({
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let mailboxes = Array.isArray(result) ? result : (result.mailboxes ?? result.data ?? []);

    return {
      output: { mailboxes },
      message: `Retrieved ${mailboxes.length} mailbox(es).`
    };
  })
  .build();
