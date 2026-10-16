import { SlateTool } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUserTool = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Get the authenticated Jira user, including the account ID used for assignments and customer membership.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.string(),
      displayName: z.string().optional(),
      emailAddress: z.string().optional(),
      active: z.boolean().optional(),
      accountType: z.string().optional(),
      timeZone: z.string().optional(),
      avatarUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let user = await new JiraClient(ctx.auth).getCurrentUser();
    return {
      output: {
        accountId: user.accountId,
        displayName: user.displayName,
        emailAddress: user.emailAddress,
        active: user.active,
        accountType: user.accountType,
        timeZone: user.timeZone,
        avatarUrl: user.avatarUrls?.['48x48']
      },
      message: `Retrieved the current Jira user: ${user.displayName ?? user.accountId}.`
    };
  })
  .build();
