import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let optionalString = (value: unknown) =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve all users (teammates) in your Apollo organization. Returns user IDs, names, and emails. User IDs are needed for assigning ownership on contacts, accounts, deals, and tasks.`,
  constraints: ['Requires a master API key'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string().optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().optional(),
          imageUrl: z.string().optional(),
          teamId: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let result = await client.listUsers();

    let users = result.users.map(u => ({
      userId: optionalString(u.id),
      firstName: optionalString(u.first_name),
      lastName: optionalString(u.last_name),
      email: optionalString(u.email),
      imageUrl: optionalString(u.image_url),
      teamId: optionalString(u.team_id)
    }));

    return {
      output: { users },
      message: `Found **${users.length}** user(s) in the organization.`
    };
  })
  .build();

export let listStages = SlateTool.create(spec, {
  name: 'List Stages',
  key: 'list_stages',
  description: `Retrieve available stages for contacts, accounts, and deals. Stage IDs are needed when creating or updating records. Returns all stage types in a single call.`,
  constraints: ['Requires a master API key for some stage types'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      stageType: z.enum(['contact', 'account', 'deal']).describe('Type of stages to retrieve')
    })
  )
  .output(
    z.object({
      stages: z.array(
        z.object({
          stageId: z.string(),
          name: z.string(),
          order: z.number().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let stages: Array<{ stageId: string; name: string; order?: number }> = [];

    if (ctx.input.stageType === 'contact') {
      let result = await client.listContactStages();
      stages = result.contactStages.map((s, i) => ({
        stageId: s.id,
        name: s.name,
        order: s.order ?? i
      }));
    } else if (ctx.input.stageType === 'account') {
      let result = await client.listAccountStages();
      stages = result.accountStages.map((s, i) => ({
        stageId: s.id,
        name: s.name,
        order: s.order ?? i
      }));
    } else if (ctx.input.stageType === 'deal') {
      let result = await client.listDealStages();
      stages = result.dealStages.map((s, i) => ({
        stageId: s.id,
        name: s.name,
        order: s.order ?? i
      }));
    }

    return {
      output: { stages },
      message: `Found **${stages.length}** ${ctx.input.stageType} stage(s): ${stages.map(s => s.name).join(', ')}.`
    };
  })
  .build();

export let listEmailAccounts = SlateTool.create(spec, {
  name: 'List Email Accounts',
  key: 'list_email_accounts',
  description:
    'Retrieve linked email inboxes for Apollo teammates. Email account IDs are used when adding contacts to sequences.',
  constraints: ['Requires a master API key'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      emailAccounts: z.array(
        z.object({
          emailAccountId: z.string().optional(),
          userId: z.string().optional(),
          email: z.string().optional(),
          aliases: z.array(z.string()).optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let result = await client.listEmailAccounts();
    let emailAccounts = result.emailAccounts.map(account => ({
      emailAccountId: account.id,
      userId: account.user_id,
      email: account.email,
      aliases: account.aliases
    }));

    return {
      output: { emailAccounts },
      message: `Found **${emailAccounts.length}** email account(s).`
    };
  })
  .build();

export let getUsageStats = SlateTool.create(spec, {
  name: 'Get Usage Stats',
  key: 'get_usage_stats',
  description: "Retrieve Apollo API usage statistics and rate limits for your team's API key.",
  constraints: ['Requires a master API key'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      usageStats: z.record(z.string(), z.any())
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let usageStats = await client.getUsageStats();

    return {
      output: { usageStats },
      message: 'Retrieved Apollo API usage statistics.'
    };
  })
  .build();
