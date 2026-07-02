import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEmailAccounts = SlateTool.create(spec, {
  name: 'List Email Accounts',
  key: 'list_email_accounts',
  description: `Retrieve all email accounts connected to your Reply.io account. Optionally filter to show only disconnected accounts that need attention before they impact campaign deliverability.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      disconnectedOnly: z
        .boolean()
        .optional()
        .describe('Set to true to only return disconnected email accounts')
    })
  )
  .output(
    z.object({
      emailAccounts: z.array(z.record(z.string(), z.any())).describe('List of email accounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.disconnectedOnly) {
      result = await client.listDisconnectedEmailAccounts();
    } else {
      result = await client.listEmailAccounts();
    }

    let emailAccounts = Array.isArray(result) ? result : (result?.items ?? []);

    return {
      output: { emailAccounts },
      message: `Found **${emailAccounts.length}** ${ctx.input.disconnectedOnly ? 'disconnected ' : ''}email account(s).`
    };
  })
  .build();
