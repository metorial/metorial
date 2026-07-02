import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let newAccounts = SlateTrigger.create(spec, {
  name: 'New Accounts',
  key: 'new_accounts',
  description:
    '[Polling fallback] Polls for newly created accounts (companies) in Nutshell CRM. Detects accounts added since the last check.'
})
  .input(
    z.object({
      accountId: z.number().describe('ID of the account'),
      name: z.string().describe('Account name'),
      createdTime: z.string().optional().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      accountId: z.number().describe('ID of the account'),
      name: z.string().describe('Account name'),
      urls: z.array(z.any()).optional().describe('Website URLs'),
      phones: z.array(z.any()).optional().describe('Phone numbers'),
      industry: z.any().optional().describe('Associated industry'),
      owner: z.any().optional().describe('Account owner'),
      createdTime: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new NutshellClient({
        username: ctx.auth.username,
        token: ctx.auth.token
      });

      let lastSeenId = (ctx.state as any)?.lastSeenId as number | undefined;

      let results = await client.findAccounts({
        orderBy: 'id',
        orderDirection: 'DESC',
        limit: 50,
        page: 1
      });

      let newAccountsList = lastSeenId
        ? results.filter((a: any) => a.id > lastSeenId)
        : results.slice(0, 1);

      let highestId =
        results.length > 0 ? Math.max(...results.map((a: any) => a.id)) : lastSeenId;

      let inputs = newAccountsList.map((a: any) => ({
        accountId: a.id,
        name: a.name,
        createdTime: a.createdTime
      }));

      return {
        inputs,
        updatedState: {
          lastSeenId: highestId ?? lastSeenId
        }
      };
    },

    handleEvent: async ctx => {
      let client = new NutshellClient({
        username: ctx.auth.username,
        token: ctx.auth.token
      });

      let account: any;
      try {
        account = await client.getAccount(ctx.input.accountId);
      } catch {
        account = null;
      }

      return {
        type: 'account.created',
        id: `account-${ctx.input.accountId}`,
        output: {
          accountId: ctx.input.accountId,
          name: account?.name || ctx.input.name,
          urls: account?.url || account?.urls,
          phones: account?.phone || account?.phones,
          industry: account?.industry,
          owner: account?.owner,
          createdTime: account?.createdTime || ctx.input.createdTime
        }
      };
    }
  })
  .build();
