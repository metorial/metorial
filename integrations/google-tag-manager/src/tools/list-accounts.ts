import { SlateTool } from 'slates';
import { z } from 'zod';
import { GtmClient } from '../lib/client';
import { googleTagManagerActionScopes } from '../scopes';
import { spec } from '../spec';

let accountSchema = z.object({
  accountId: z.string().optional().describe('GTM account ID'),
  name: z.string().optional().describe('Account name'),
  shareData: z.boolean().optional().describe('Whether data sharing is enabled'),
  fingerprint: z.string().optional().describe('Account fingerprint'),
  tagManagerUrl: z.string().optional().describe('URL to the GTM UI for this account')
});

let containerSchema = z.object({
  containerId: z.string().optional().describe('GTM container ID'),
  name: z.string().optional().describe('Container name'),
  publicId: z.string().optional().describe('Container public ID (e.g., GTM-XXXX)'),
  usageContext: z
    .array(z.string())
    .optional()
    .describe('Container usage contexts (web, android, ios, amp, server)'),
  domainName: z.array(z.string()).optional().describe('Associated domain names'),
  notes: z.string().optional().describe('Container notes'),
  fingerprint: z.string().optional().describe('Container fingerprint'),
  tagManagerUrl: z.string().optional().describe('URL to the GTM UI for this container')
});

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts & Containers',
  key: 'list_accounts',
  description: `Lists GTM accounts you have access to, optionally including their containers. Use this to discover account and container IDs needed for other operations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleTagManagerActionScopes.listAccounts)
  .input(
    z.object({
      includeContainers: z
        .boolean()
        .optional()
        .describe('Whether to also list containers for each account (default: false)'),
      accountId: z
        .string()
        .optional()
        .describe('If provided, only list containers for this specific account')
    })
  )
  .output(
    z.object({
      accounts: z
        .array(
          z.object({
            account: accountSchema,
            containers: z
              .array(containerSchema)
              .optional()
              .describe('Containers under this account (only if includeContainers is true)')
          })
        )
        .describe('List of GTM accounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GtmClient(ctx.auth.token);

    let accounts: Array<{
      account: unknown;
      containers?: unknown[];
    }> = [];

    if (ctx.input.accountId) {
      let account = await client.getAccount(ctx.input.accountId);
      let entry: { account: unknown; containers?: unknown[] } = { account };

      if (ctx.input.includeContainers) {
        let containersResponse = await client.listContainers(ctx.input.accountId);
        entry.containers = containersResponse.container || [];
      }

      accounts.push(entry);
    } else {
      let accountsResponse = await client.listAccounts();
      let accountList = accountsResponse.account || [];

      for (let account of accountList) {
        let entry: { account: unknown; containers?: unknown[] } = { account };

        if (ctx.input.includeContainers && account.accountId) {
          let containersResponse = await client.listContainers(account.accountId);
          entry.containers = containersResponse.container || [];
        }

        accounts.push(entry);
      }
    }

    let totalAccounts = accounts.length;
    let totalContainers = accounts.reduce((sum, a) => sum + (a.containers?.length || 0), 0);

    return {
      output: { accounts } as any,
      message: ctx.input.includeContainers
        ? `Found **${totalAccounts}** account(s) with **${totalContainers}** container(s) total.`
        : `Found **${totalAccounts}** account(s).`
    };
  })
  .build();
