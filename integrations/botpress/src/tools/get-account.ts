import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdminClient } from '../lib/client';
import { spec } from '../spec';

export const getAccountTool = SlateTool.create(spec, {
  key: 'get_account',
  name: 'Get Account',
  description: 'Get the account identity associated with the connected Personal Access Token.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.string(),
      email: z.string(),
      displayName: z.string().optional(),
      emailVerified: z.boolean(),
      createdAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    const { account } = await new AdminClient({ token: ctx.auth.token }).getAccount();
    return {
      output: {
        accountId: account.id,
        email: account.email,
        displayName: account.displayName,
        emailVerified: account.emailVerified,
        createdAt: account.createdAt
      },
      message: `Retrieved account **${account.displayName || account.email}**.`
    };
  })
  .build();
