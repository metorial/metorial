import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSubaccount = SlateTool.create(spec, {
  name: 'Manage Subaccount',
  key: 'manage_subaccount',
  description: `Create, retrieve, update, delete, or list subaccounts for agency-level operations. Subaccounts share the main account's total concurrency, as set by your plan.`
})
  .input(
    z.object({
      operation: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Operation to perform'),
      subaccountId: z
        .string()
        .optional()
        .describe('Subaccount ID (required for get, update, delete)'),
      subaccountName: z
        .string()
        .optional()
        .describe('Unique name for the subaccount (used in create/update)'),
      userEmail: z
        .string()
        .optional()
        .describe('Email to invite (generates sign-in link, used in create)'),
      maxCalls: z
        .number()
        .optional()
        .describe('Maximum concurrent calls (used in create/update)')
    })
  )
  .output(
    z.object({
      subaccount: z.record(z.string(), z.any()).optional().describe('Subaccount details'),
      subaccounts: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of subaccounts'),
      deleted: z.boolean().optional().describe('Whether the subaccount was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { operation, subaccountId, subaccountName, userEmail, maxCalls } = ctx.input;

    if (operation === 'create') {
      let body: Record<string, any> = {};
      if (subaccountName) body.subaccount_name = subaccountName;
      if (userEmail) body.user_email = userEmail;
      if (maxCalls !== undefined) body.max_calls = maxCalls;
      let result = await client.createSubaccount(body);
      return {
        output: { subaccount: result.response || result },
        message: `Created subaccount **${subaccountName || 'Unknown'}**.`
      };
    }

    if (operation === 'get') {
      if (!subaccountId) throw new Error('subaccountId is required for get operation');
      let result = await client.getSubaccount(subaccountId);
      return {
        output: { subaccount: result.response || result },
        message: `Retrieved subaccount \`${subaccountId}\`.`
      };
    }

    if (operation === 'update') {
      if (!subaccountId) throw new Error('subaccountId is required for update operation');
      let body: Record<string, any> = {};
      if (subaccountName) body.subaccount_name = subaccountName;
      if (maxCalls !== undefined) body.max_calls = maxCalls;
      let result = await client.updateSubaccount(subaccountId, body);
      return {
        output: { subaccount: result.response || result },
        message: `Updated subaccount \`${subaccountId}\`.`
      };
    }

    if (operation === 'delete') {
      if (!subaccountId) throw new Error('subaccountId is required for delete operation');
      await client.deleteSubaccount(subaccountId);
      return {
        output: { deleted: true },
        message: `Deleted subaccount \`${subaccountId}\`.`
      };
    }

    if (operation === 'list') {
      let result = await client.listSubaccounts();
      let subaccounts = result.response?.subaccounts || result.response || [];
      return {
        output: { subaccounts: Array.isArray(subaccounts) ? subaccounts : [] },
        message: `Found ${Array.isArray(subaccounts) ? subaccounts.length : 0} subaccount(s).`
      };
    }

    throw new Error(`Unknown operation: ${operation}`);
  })
  .build();
