import { SlateTool } from 'slates';
import { z } from 'zod';
import { BlazeMeterClient } from '../lib/client';
import { spec } from '../spec';

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List all workspaces and accounts you have access to. Returns the hierarchy of accounts and their workspaces, which is needed to navigate the BlazeMeter resource structure.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z
        .number()
        .optional()
        .describe(
          'Specific account ID to list workspaces for. If omitted, lists all accounts first.'
        )
    })
  )
  .output(
    z.object({
      accounts: z
        .array(
          z.object({
            accountId: z.number().describe('Account ID'),
            name: z.string().describe('Account name'),
            workspaces: z
              .array(
                z.object({
                  workspaceId: z.number().describe('Workspace ID'),
                  name: z.string().describe('Workspace name'),
                  enabled: z.boolean().optional().describe('Whether the workspace is enabled')
                })
              )
              .optional()
              .describe('Workspaces within this account')
          })
        )
        .describe('Accounts and their workspaces')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BlazeMeterClient({
      token: ctx.auth.token,
      apiKeyId: ctx.auth.apiKeyId,
      apiKeySecret: ctx.auth.apiKeySecret
    });

    if (ctx.input.accountId) {
      let workspaces = await client.listWorkspaces(ctx.input.accountId);
      let mapped = workspaces.map((w: any) => ({
        workspaceId: w.id,
        name: w.name,
        enabled: w.enabled
      }));
      return {
        output: {
          accounts: [
            {
              accountId: ctx.input.accountId,
              name: `Account ${ctx.input.accountId}`,
              workspaces: mapped
            }
          ]
        },
        message: `Found **${mapped.length}** workspace(s) in account ${ctx.input.accountId}.`
      };
    }

    let accounts = await client.listAccounts();
    let result: any[] = [];

    for (let account of accounts) {
      try {
        let workspaces = await client.listWorkspaces(account.id);
        result.push({
          accountId: account.id,
          name: account.name,
          workspaces: workspaces.map((w: any) => ({
            workspaceId: w.id,
            name: w.name,
            enabled: w.enabled
          }))
        });
      } catch {
        result.push({
          accountId: account.id,
          name: account.name,
          workspaces: []
        });
      }
    }

    let totalWorkspaces = result.reduce((sum, a) => sum + (a.workspaces?.length || 0), 0);
    return {
      output: { accounts: result },
      message: `Found **${result.length}** account(s) with **${totalWorkspaces}** workspace(s) total.`
    };
  })
  .build();
