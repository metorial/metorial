import { SlateTool } from 'slates';
import { z } from 'zod';
import { getAccount } from '../lib/client';
import { spec } from '../spec';

export let getAccountDetails = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description:
    'Get the workspace, account owner, and request allowance associated with the connected API key.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      id: z.string().optional(),
      workspaceId: z.string().optional(),
      name: z.string().optional(),
      workspaceName: z.string().optional(),
      userId: z.string().optional(),
      email: z.string().optional(),
      maxRequestCount: z.union([z.number(), z.string()]).optional(),
      createdAt: z.union([z.number(), z.string()]).optional(),
      dateCreated: z.union([z.number(), z.string()]).optional()
    })
  )
  .handleInvocation(async ctx => ({
    output: await getAccount(ctx.auth.token),
    message: 'Retrieved the connected CustomJS account.'
  }))
  .build();
