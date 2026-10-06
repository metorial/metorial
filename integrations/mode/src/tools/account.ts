import { SlateTool } from 'slates';
import { z } from 'zod';
import { ModeClient } from '../lib/client';
import { spec } from '../spec';

export const getCurrentAccount = SlateTool.create(spec, {
  name: 'Get Current Account',
  key: 'get_current_account',
  description:
    'Verify the API credentials and retrieve the configured, authorized Mode account. Workspace tokens identify the workspace rather than an individual user.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accountName: z.string(),
      accountId: z.number(),
      accountToken: z.string(),
      name: z.string(),
      userAccount: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    const account = await ModeClient.fromContext(ctx).getCurrentAccount();
    return {
      output: account,
      message: `Verified access to **${account.name || account.accountName}**.`
    };
  })
  .build();
