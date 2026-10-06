import { SlateTool } from 'slates';
import { z } from 'zod';
import { QdrantCloudClient } from '../lib/cloud-client';
import { spec } from '../spec';

export let listAccounts = SlateTool.create(spec, {
  name: 'List Cloud Accounts',
  key: 'list_accounts',
  description:
    'Lists the Qdrant Cloud accounts accessible to the management key. Use the returned accountId in cloud cluster and configuration tools.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accounts: z.array(
        z.object({
          accountId: z.string(),
          accountName: z.string(),
          createdAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new QdrantCloudClient(ctx.auth);
    let result = await client.listAccounts();
    let accounts = (result.items ?? []).map(account => ({
      accountId: account.id,
      accountName: account.name,
      createdAt: account.createdAt
    }));
    return {
      output: { accounts },
      message: `Found **${accounts.length}** accessible cloud account(s).`
    };
  })
  .build();
