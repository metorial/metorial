import { createApiServiceError, pickDefined, SlateTool } from 'slates';
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
        .int()
        .nonnegative()
        .optional()
        .describe('Maximum concurrent calls (used in create/update; maps to concurrency)'),
      maxAgents: z
        .number()
        .int()
        .nonnegative()
        .nullable()
        .optional()
        .describe('Agent limit; null removes the limit (create/update)'),
      maxMinutes: z
        .number()
        .int()
        .nonnegative()
        .nullable()
        .optional()
        .describe('Minute limit; null removes the limit (create/update)')
    })
  )
  .output(
    z.object({
      subaccount: z.record(z.string(), z.any()).optional().describe('Subaccount details'),
      subaccounts: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of subaccounts'),
      subaccountId: z.string().optional().describe('Subaccount ID'),
      deleted: z.boolean().optional().describe('Whether the subaccount was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { operation, subaccountId, subaccountName, userEmail, maxCalls } = ctx.input;

    if (operation === 'create') {
      if (!subaccountName?.trim())
        throw createApiServiceError('subaccountName is required to create a subaccount.');
      let body: Record<string, any> = {};
      if (subaccountName) body.subaccount_name = subaccountName;
      if (userEmail) body.user_email = userEmail;
      if (maxCalls !== undefined) body.concurrency = maxCalls;
      if (ctx.input.maxAgents !== undefined) body.max_agents = ctx.input.maxAgents;
      if (ctx.input.maxMinutes !== undefined) body.max_minutes = ctx.input.maxMinutes;
      let result = await client.createSubaccount(body);
      if (!result.response?.subaccount_id)
        throw createApiServiceError('Synthflow did not return the created subaccount ID.');
      let { api_key: _apiKey, sign_in_link: _signInLink, ...subaccount } = result.response;
      return {
        output: { subaccount, subaccountId: subaccount.subaccount_id },
        message: `Created subaccount **${subaccountName || 'Unknown'}**.`
      };
    }

    if (operation === 'get') {
      if (!subaccountId)
        throw createApiServiceError('subaccountId is required for get operation');
      let result = await client.getSubaccount(subaccountId);
      let subaccounts = result.response?.subaccounts;
      let subaccount = Array.isArray(subaccounts)
        ? subaccounts.find(item => item?.subaccount_id === subaccountId)
        : undefined;
      if (!subaccount)
        throw createApiServiceError('Synthflow did not return the requested subaccount.');
      return {
        output: { subaccount, subaccountId },
        message: `Retrieved subaccount \`${subaccountId}\`.`
      };
    }

    if (operation === 'update') {
      if (!subaccountId)
        throw createApiServiceError('subaccountId is required for update operation');
      if (userEmail !== undefined)
        throw createApiServiceError('userEmail is only supported when creating a subaccount.');
      let body = pickDefined({
        subaccount_name: subaccountName,
        concurrency: maxCalls,
        max_agents: ctx.input.maxAgents,
        max_minutes: ctx.input.maxMinutes
      });
      if (!Object.keys(body).length)
        throw createApiServiceError('Provide at least one subaccount field to update.');
      await client.updateSubaccount(subaccountId, body);
      let result = await client.getSubaccount(subaccountId);
      let subaccounts = result.response?.subaccounts;
      let subaccount = Array.isArray(subaccounts)
        ? subaccounts.find(item => item?.subaccount_id === subaccountId)
        : undefined;
      if (!subaccount)
        throw createApiServiceError('Synthflow did not return the updated subaccount.');
      return {
        output: { subaccount, subaccountId },
        message: `Updated subaccount \`${subaccountId}\`.`
      };
    }

    if (operation === 'delete') {
      if (!subaccountId)
        throw createApiServiceError('subaccountId is required for delete operation');
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

    throw createApiServiceError(`Unknown operation: ${operation}`);
  })
  .build();
