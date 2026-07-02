import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLinkedInAccounts = SlateTool.create(spec, {
  name: 'List LinkedIn Accounts',
  key: 'list_linkedin_accounts',
  description: `Retrieve all connected LinkedIn accounts used for LinkedIn campaign steps (profile visits, connection requests, and messages).`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accounts: z
        .array(
          z.object({
            accountId: z.number().optional().describe('LinkedIn account ID'),
            name: z.string().optional().describe('Account name'),
            email: z.string().optional().describe('Associated email'),
            status: z.string().optional().describe('Connection status')
          })
        )
        .describe('List of connected LinkedIn accounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let data: any = await client.listLinkedInAccounts();
    let accounts: any[] = Array.isArray(data) ? data : (data?.linkedin_accounts ?? []);

    let mapped = accounts.map((a: any) => ({
      accountId: a.id,
      name: a.name,
      email: a.email,
      status: a.status
    }));

    return {
      output: { accounts: mapped },
      message: `Found **${mapped.length}** LinkedIn account(s).`
    };
  })
  .build();
