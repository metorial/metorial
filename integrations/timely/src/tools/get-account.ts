import { SlateTool } from 'slates';
import { z } from 'zod';
import { createTimelyClient } from '../lib/client';
import { accountIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Call list_accounts to choose a workspace when needed. Retrieve account (workspace) details from Timely including plan info, currency, capacity settings, user counts, and feature flags.`,
  tags: { readOnly: true }
})
  .input(z.object({ accountId: accountIdSchema }))
  .output(
    z.object({
      accountId: z.number().describe('Account ID'),
      name: z.string().describe('Account/workspace name'),
      currency: z.string().nullable().describe('Currency ISO code'),
      planName: z.string().nullable().describe('Current plan name'),
      numUsers: z.number().nullable().describe('Number of users'),
      numProjects: z.number().nullable().describe('Number of projects'),
      weeklyCapacity: z.number().nullable().describe('Default weekly user capacity in hours'),
      defaultHourRate: z.number().nullable().describe('Default hourly rate'),
      status: z.string().nullable().describe('Account status'),
      startOfWeek: z.number().nullable().describe('Start of week (0=Sunday, 1=Monday)')
    })
  )
  .handleInvocation(async ctx => {
    let client = await createTimelyClient(ctx);

    let account = await client.getAccount();

    return {
      output: {
        accountId: account.id,
        name: account.name,
        currency: account.currency?.iso_code ?? null,
        planName: account.plan_name ?? null,
        numUsers: account.num_users ?? null,
        numProjects: account.num_projects ?? null,
        weeklyCapacity: account.weekly_user_capacity ?? null,
        defaultHourRate: account.default_hour_rate ?? null,
        status: account.status ?? null,
        startOfWeek: account.start_of_week ?? null
      },
      message: `Account **${account.name}** — ${account.plan_name ?? 'Unknown'} plan, ${account.num_users ?? 0} users, ${account.num_projects ?? 0} projects.`
    };
  })
  .build();
