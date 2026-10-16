import { SlateTool } from 'slates';
import { z } from 'zod';
import { DotSimpleClient } from '../lib/client';
import { workspaceId } from '../lib/schemas';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description:
    'Retrieve a connected social account, including its authorization state and platform-specific metadata. Call list_accounts to find account UUIDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      workspaceId,
      accountUuid: z.string().describe('Account UUID from list_accounts')
    })
  )
  .output(z.object({ account: z.record(z.string(), z.unknown()) }))
  .handleInvocation(async ctx => {
    let client = new DotSimpleClient({
      token: ctx.auth.token,
      workspaceId: ctx.input.workspaceId ?? ctx.config.workspaceId
    });
    let account = await client.getAccount(ctx.input.accountUuid);
    return { output: { account }, message: 'Retrieved the connected social account.' };
  })
  .build();
