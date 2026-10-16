import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve your Nusii account information including company name, default currency, locale, and theme. Also returns the first page of account users and available themes. Use list_users for further pages.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      raw: z.record(z.string(), z.unknown()).optional(),
      accountId: z.string(),
      company: z.string(),
      currency: z.string(),
      locale: z.string().optional(),
      theme: z.string().optional(),
      users: z.array(
        z.object({
          userId: z.string(),
          email: z.string(),
          name: z.string()
        })
      ),
      themes: z.array(
        z.object({
          themeId: z.string(),
          name: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let [account, usersResult, themes] = await Promise.all([
      client.getAccount(),
      client.listUsers(),
      client.listThemes()
    ]);

    return {
      output: {
        ...account,
        raw: { account: account.raw, users: usersResult.raw, themes },
        users: usersResult.items,
        themes
      },
      message: `Account **${account.company}** — ${usersResult.items.length} users, default currency: ${account.currency}.`
    };
  })
  .build();
