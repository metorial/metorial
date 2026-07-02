import { SlateTool } from 'slates';
import { z } from 'zod';
import { ThanksIoClient } from '../lib/client';
import { spec } from '../spec';

export let manageSubAccounts = SlateTool.create(spec, {
  name: 'Manage Sub-Accounts',
  key: 'manage_sub_accounts',
  description: `Create, list, retrieve, update, or delete sub-accounts for managing multiple clients or business units.
Sub-accounts have their own return address, branding fields, and can be associated with mailing lists and orders. Deleting a sub-account moves its orders and mailing lists to the main account.`,
  instructions: [
    'Set action to "list", "create", "get", "update", or "delete".',
    'For "get", "update", or "delete", provide the subAccountId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'get', 'update', 'delete'])
        .describe('Action to perform'),
      subAccountId: z.number().optional().describe('Sub-account ID (for get, update, delete)'),
      name: z.string().optional().describe('Sub-account name'),
      returnName: z.string().optional().describe('Return address name'),
      returnAddress: z.string().optional().describe('Return street address'),
      returnAddress2: z.string().optional().describe('Return address line 2'),
      returnCity: z.string().optional().describe('Return city'),
      returnState: z.string().optional().describe('Return state code'),
      returnPostalCode: z.string().optional().describe('Return ZIP code')
    })
  )
  .output(
    z.object({
      subAccountId: z.number().optional().describe('Sub-account ID'),
      subAccountName: z.string().optional().nullable().describe('Sub-account name'),
      subAccounts: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of sub-accounts'),
      deleted: z.boolean().optional().describe('Whether the sub-account was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ThanksIoClient({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listSubAccounts();
      let data = (Array.isArray(result) ? result : result.data || []) as Record<
        string,
        unknown
      >[];
      return {
        output: { subAccounts: data },
        message: `Found **${data.length}** sub-account(s).`
      };
    }

    if (action === 'create') {
      let result = await client.createSubAccount({
        name: ctx.input.name,
        returnName: ctx.input.returnName,
        returnAddress: ctx.input.returnAddress,
        returnAddress2: ctx.input.returnAddress2,
        returnCity: ctx.input.returnCity,
        returnState: ctx.input.returnState,
        returnPostalCode: ctx.input.returnPostalCode
      });
      return {
        output: {
          subAccountId: result.id as number,
          subAccountName: result.name as string | null
        },
        message: `Created sub-account **#${result.id}**: "${result.name}".`
      };
    }

    if (action === 'get') {
      if (!ctx.input.subAccountId) throw new Error('subAccountId is required for get action');
      let result = await client.getSubAccount(ctx.input.subAccountId);
      return {
        output: {
          subAccountId: result.id as number,
          subAccountName: result.name as string | null
        },
        message: `Retrieved sub-account **#${result.id}**: "${result.name}".`
      };
    }

    if (action === 'update') {
      if (!ctx.input.subAccountId)
        throw new Error('subAccountId is required for update action');
      let result = await client.updateSubAccount(ctx.input.subAccountId, {
        name: ctx.input.name,
        returnName: ctx.input.returnName,
        returnAddress: ctx.input.returnAddress,
        returnAddress2: ctx.input.returnAddress2,
        returnCity: ctx.input.returnCity,
        returnState: ctx.input.returnState,
        returnPostalCode: ctx.input.returnPostalCode
      });
      return {
        output: {
          subAccountId: result.id as number,
          subAccountName: result.name as string | null
        },
        message: `Updated sub-account **#${result.id}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.subAccountId)
        throw new Error('subAccountId is required for delete action');
      await client.deleteSubAccount(ctx.input.subAccountId);
      return {
        output: {
          subAccountId: ctx.input.subAccountId,
          deleted: true
        },
        message: `Deleted sub-account **#${ctx.input.subAccountId}**. Orders and mailing lists moved to main account.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
