import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignWellClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the user, role, account, and workspace associated with the connected API key.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      membershipId: z.string().describe('ID of the account membership'),
      userId: z.string().describe('ID of the authenticated user'),
      name: z.string().describe('Name of the authenticated user'),
      email: z.string().describe('Email of the authenticated user'),
      role: z.string().describe('Role within the account'),
      accountId: z.string().describe('ID of the connected account'),
      accountName: z.string().describe('Name of the connected account'),
      workspaceId: z.string().optional().describe('ID of the connected workspace'),
      workspaceName: z.string().optional().describe('Name of the connected workspace'),
      planTier: z.string().optional().describe('Current account plan tier')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SignWellClient({ token: ctx.auth.token });
    let result = await client.getMe();
    return {
      output: {
        membershipId: result.id ?? undefined,
        userId: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.role ?? undefined,
        accountId: result.account.id,
        accountName: result.account.name,
        workspaceId: result.workspace?.id,
        workspaceName: result.workspace?.name,
        planTier: result.account.plan_tier ?? undefined
      },
      message: `Connected as **${result.user.name}** in **${result.account.name}**.`
    };
  })
  .build();
