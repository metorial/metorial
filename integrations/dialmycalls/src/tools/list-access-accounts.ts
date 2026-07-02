import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAccessAccounts = SlateTool.create(spec, {
  name: 'List Access Accounts',
  key: 'list_access_accounts',
  description: `Retrieve sub-accounts (access accounts) that can schedule broadcasts on behalf of the main account.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accessAccountId: z
        .string()
        .optional()
        .describe(
          'Fetch a specific access account by ID. If omitted, lists all access accounts.'
        ),
      range: z.string().optional().describe('Pagination range, e.g. "records=201-300"')
    })
  )
  .output(
    z.object({
      accessAccounts: z.array(
        z.object({
          accessAccountId: z.string().optional(),
          name: z.string().optional(),
          email: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.accessAccountId) {
      let account = await client.getAccessAccount(ctx.input.accessAccountId);
      return {
        output: {
          accessAccounts: [
            {
              accessAccountId: account.id,
              name: account.name,
              email: account.email,
              createdAt: account.created_at,
              updatedAt: account.updated_at
            }
          ]
        },
        message: `Retrieved access account **${account.name}**.`
      };
    }

    let rawAccounts = await client.listAccessAccounts(ctx.input.range);
    let accessAccounts = rawAccounts.map(a => ({
      accessAccountId: a.id,
      name: a.name,
      email: a.email,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    }));

    return {
      output: { accessAccounts },
      message: `Retrieved **${accessAccounts.length}** access account(s).`
    };
  })
  .build();
