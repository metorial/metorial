import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let accountChanges = SlateTrigger.create(spec, {
  name: 'Account Changes',
  key: 'account_changes',
  description: 'Polls for new, updated, or deleted accounts in a budget using delta requests.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('Type of change detected'),
      accountId: z.string().describe('Account ID'),
      name: z.string().describe('Account name'),
      type: z.string().describe('Account type'),
      balance: z.number().describe('Balance in milliunits'),
      clearedBalance: z.number().describe('Cleared balance in milliunits'),
      unclearedBalance: z.number().describe('Uncleared balance in milliunits'),
      closed: z.boolean().describe('Whether closed'),
      deleted: z.boolean().describe('Whether deleted')
    })
  )
  .output(
    z.object({
      accountId: z.string().describe('Account ID'),
      name: z.string().describe('Account name'),
      type: z.string().describe('Account type'),
      balance: z.number().describe('Balance in milliunits'),
      clearedBalance: z.number().describe('Cleared balance in milliunits'),
      unclearedBalance: z.number().describe('Uncleared balance in milliunits'),
      closed: z.boolean().describe('Whether closed')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let budgetId = ctx.config.budgetId;

      let lastKnowledge = ctx.state?.serverKnowledge as number | undefined;
      let previousIds = (ctx.state?.knownAccountIds as string[] | undefined) ?? [];

      let result = await client.getAccounts(budgetId, lastKnowledge);

      let inputs = result.accounts.map((a: any) => {
        let isDeleted = a.deleted === true;
        let isKnown = previousIds.includes(a.id);
        let changeType: 'created' | 'updated' | 'deleted' = isDeleted
          ? 'deleted'
          : isKnown
            ? 'updated'
            : 'created';

        return {
          changeType,
          accountId: a.id,
          name: a.name,
          type: a.type,
          balance: a.balance,
          clearedBalance: a.cleared_balance,
          unclearedBalance: a.uncleared_balance,
          closed: a.closed,
          deleted: a.deleted
        };
      });

      let newIds = new Set(previousIds);
      for (let input of inputs) {
        if (input.deleted) {
          newIds.delete(input.accountId);
        } else {
          newIds.add(input.accountId);
        }
      }

      return {
        inputs,
        updatedState: {
          serverKnowledge: result.serverKnowledge,
          knownAccountIds: Array.from(newIds)
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `account.${ctx.input.changeType}`,
        id: `${ctx.input.accountId}-${ctx.input.changeType}`,
        output: {
          accountId: ctx.input.accountId,
          name: ctx.input.name,
          type: ctx.input.type,
          balance: ctx.input.balance,
          clearedBalance: ctx.input.clearedBalance,
          unclearedBalance: ctx.input.unclearedBalance,
          closed: ctx.input.closed
        }
      };
    }
  })
  .build();
