import { SlateTool } from 'slates';
import { z } from 'zod';
import { DriftClient } from '../lib/client';
import { spec } from '../spec';

export let manageAccount = SlateTool.create(spec, {
  name: 'Manage Account',
  key: 'manage_account',
  description: `Create, retrieve, update, or delete an account in Drift. Accounts are used for personal account tracking and ABM (account-based marketing) targeting in playbooks.`,
  instructions: [
    'Set action to "create" to create a new account (ownerId and name are required).',
    'Set action to "get" or "list" to retrieve accounts.',
    'Set action to "update" to update an existing account.',
    'Set action to "delete" to permanently remove an account.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'update', 'delete'])
        .describe('Operation to perform'),
      accountId: z
        .string()
        .optional()
        .describe('Account ID (required for get, update, delete)'),
      ownerId: z.number().optional().describe('Owner user ID (required for create)'),
      name: z.string().optional().describe('Account name'),
      domain: z.string().optional().describe('Account domain'),
      customProperties: z
        .array(
          z.object({
            label: z.string(),
            name: z.string(),
            value: z.any(),
            type: z.string()
          })
        )
        .optional()
        .describe('Custom properties for the account')
    })
  )
  .output(
    z.object({
      accounts: z
        .array(
          z.object({
            accountId: z.string().optional().describe('Account ID'),
            ownerId: z.number().optional().describe('Owner user ID'),
            name: z.string().optional().describe('Account name'),
            domain: z.string().optional().describe('Account domain'),
            targeted: z.boolean().optional().describe('Whether the account is targeted'),
            deleted: z.boolean().optional().describe('Whether the account is deleted'),
            createDateTime: z.number().optional().describe('Creation timestamp'),
            updateDateTime: z.number().optional().describe('Last update timestamp'),
            customProperties: z.array(z.any()).optional().describe('Custom properties')
          })
        )
        .optional(),
      deleted: z.boolean().optional().describe('Whether a delete operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DriftClient(ctx.auth.token);

    let mapAccount = (a: any) => ({
      accountId: a.accountId || a.id,
      ownerId: a.ownerId,
      name: a.name,
      domain: a.domain,
      targeted: a.targeted,
      deleted: a.deleted,
      createDateTime: a.createDateTime,
      updateDateTime: a.updateDateTime,
      customProperties: a.customProperties
    });

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.ownerId || !ctx.input.name) {
          throw new Error('ownerId and name are required to create an account');
        }
        let account = await client.createAccount({
          ownerId: ctx.input.ownerId,
          name: ctx.input.name,
          domain: ctx.input.domain,
          accountId: ctx.input.accountId,
          customProperties: ctx.input.customProperties
        });
        return {
          output: { accounts: [mapAccount(account)] },
          message: `Created account **${ctx.input.name}**.`
        };
      }
      case 'get': {
        if (!ctx.input.accountId) throw new Error('accountId is required');
        let account = await client.getAccount(ctx.input.accountId);
        return {
          output: { accounts: [mapAccount(account)] },
          message: `Retrieved account \`${ctx.input.accountId}\`.`
        };
      }
      case 'list': {
        let accounts = await client.listAccounts();
        return {
          output: { accounts: accounts.map(mapAccount) },
          message: `Retrieved **${accounts.length}** account(s).`
        };
      }
      case 'update': {
        if (!ctx.input.accountId) throw new Error('accountId is required');
        let updateData: Record<string, any> = {};
        if (ctx.input.name) updateData.name = ctx.input.name;
        if (ctx.input.domain) updateData.domain = ctx.input.domain;
        if (ctx.input.ownerId) updateData.ownerId = ctx.input.ownerId;
        if (ctx.input.customProperties)
          updateData.customProperties = ctx.input.customProperties;
        let account = await client.updateAccount(ctx.input.accountId, updateData);
        return {
          output: { accounts: [mapAccount(account)] },
          message: `Updated account \`${ctx.input.accountId}\`.`
        };
      }
      case 'delete': {
        if (!ctx.input.accountId) throw new Error('accountId is required');
        await client.deleteAccount(ctx.input.accountId);
        return {
          output: { deleted: true },
          message: `Deleted account \`${ctx.input.accountId}\`.`
        };
      }
    }
  })
  .build();
