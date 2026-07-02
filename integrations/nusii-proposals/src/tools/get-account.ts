import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve your Nusii account information including company name, default currency, locale, and theme. Also lists all users on the account and available themes.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.string(),
      company: z.string(),
      currency: z.string(),
      locale: z.string(),
      theme: z.string(),
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
    let client = new Client({ token: ctx.auth.token });

    let [account, usersResult, themes] = await Promise.all([
      client.getAccount(),
      client.listUsers(),
      client.listThemes()
    ]);

    return {
      output: {
        ...account,
        users: usersResult.items,
        themes
      },
      message: `Account **${account.company}** — ${usersResult.items.length} users, default currency: ${account.currency}.`
    };
  })
  .build();
