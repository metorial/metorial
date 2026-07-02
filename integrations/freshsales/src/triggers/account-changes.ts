import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let accountChanges = SlateTrigger.create(spec, {
  name: 'Account Changes',
  key: 'account_changes',
  description:
    'Triggers when accounts (companies) are created or updated in Freshsales. Monitors accounts via the default or first available view.'
})
  .input(
    z.object({
      accountId: z.number().describe('ID of the account'),
      name: z.string().nullable().optional(),
      website: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional(),
      isNew: z.boolean().describe('Whether this account is newly created since last poll')
    })
  )
  .output(
    z.object({
      accountId: z.number().describe('ID of the account'),
      name: z.string().nullable().optional(),
      website: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let viewId = ctx.state?.viewId;
      if (!viewId) {
        let filters = await client.getAccountFilters();
        let defaultFilter =
          filters.find((f: Record<string, any>) => f.is_default) || filters[0];
        if (!defaultFilter) {
          return { inputs: [], updatedState: ctx.state || {} };
        }
        viewId = defaultFilter.id;
      }

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;
      let result = await client.listAccounts(viewId, {
        sort: 'updated_at',
        sortType: 'desc',
        page: 1
      });

      let accounts = result.salesAccounts || [];
      let newInputs: any[] = [];

      for (let account of accounts) {
        if (lastPolledAt && account.updated_at && account.updated_at <= lastPolledAt) {
          break;
        }
        let isNew = !lastPolledAt || (account.created_at && account.created_at > lastPolledAt);
        newInputs.push({
          accountId: account.id,
          name: account.name,
          website: account.website,
          phone: account.phone,
          city: account.city,
          country: account.country,
          createdAt: account.created_at,
          updatedAt: account.updated_at,
          isNew
        });
      }

      let updatedLastPolledAt =
        accounts.length > 0 && accounts[0]?.updated_at ? accounts[0].updated_at : lastPolledAt;

      return {
        inputs: newInputs,
        updatedState: {
          viewId,
          lastPolledAt: updatedLastPolledAt
        }
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.isNew ? 'account.created' : 'account.updated';
      return {
        type: eventType,
        id: `${ctx.input.accountId}-${ctx.input.updatedAt || ctx.input.createdAt || Date.now()}`,
        output: {
          accountId: ctx.input.accountId,
          name: ctx.input.name,
          website: ctx.input.website,
          phone: ctx.input.phone,
          city: ctx.input.city,
          country: ctx.input.country,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
