import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ConnecteamClient } from '../lib/client';
import { spec } from '../spec';

export let manageTimeOff = SlateTool.create(spec, {
  name: 'Manage Time Off',
  key: 'manage_time_off',
  description: `Manage employee time-off: list policy types, view balances, create/update time-off requests, and update balances. Covers the full time-off workflow from viewing policies to submitting and managing requests.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_policy_types',
          'get_balances',
          'create_request',
          'update_request',
          'update_balance'
        ])
        .describe('Time-off action to perform'),
      policyTypeId: z
        .string()
        .optional()
        .describe('Policy type ID from list_policy_types (for get_balances, update_balance)'),
      userId: z.number().optional().describe('User ID (for update_balance)'),
      requestId: z.string().optional().describe('Time-off request ID (for update_request)'),
      requestBody: z
        .any()
        .optional()
        .describe(
          'For create_request: userId, policyTypeId, isAllDay, startDate/endDate (YYYY-MM-DD), timezone, status. Partial days also require startTime/endTime (HH:MM:SS). Update accepts changed fields.'
        ),
      balanceBody: z
        .any()
        .optional()
        .describe('For update_balance: an object containing a numeric balance'),
      limit: z.number().optional().describe('Results per page'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      result: z.any().describe('API response data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnecteamClient({
      ...ctx.auth,
      baseUrl: ctx.auth.baseUrl ?? (ctx.config as { baseUrl?: string }).baseUrl
    });

    let { action } = ctx.input;

    if (action === 'list_policy_types') {
      let result = await client.getTimeOffPolicyTypes();
      return {
        output: { result },
        message: `Retrieved time-off policy types.`
      };
    }

    if (action === 'get_balances') {
      if (!ctx.input.policyTypeId) throw createApiServiceError('policyTypeId is required.');
      let result = await client.getTimeOffBalances(ctx.input.policyTypeId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      return {
        output: { result },
        message: `Retrieved balances for policy type **${ctx.input.policyTypeId}**.`
      };
    }

    if (action === 'create_request') {
      let body = ctx.input.requestBody;
      if (
        !body ||
        typeof body.userId !== 'number' ||
        typeof body.policyTypeId !== 'string' ||
        typeof body.isAllDay !== 'boolean' ||
        typeof body.startDate !== 'string' ||
        typeof body.endDate !== 'string' ||
        typeof body.timezone !== 'string' ||
        !['approved', 'pending', 'denied'].includes(body.status)
      ) {
        throw createApiServiceError(
          'requestBody requires userId, policyTypeId, isAllDay, startDate, endDate, timezone, and status.'
        );
      }
      if (
        body.isAllDay === false &&
        (!body.startTime || !body.endTime || body.startDate !== body.endDate)
      ) {
        throw createApiServiceError(
          'Partial-day requests require startTime/endTime and matching startDate/endDate.'
        );
      }
      let result = await client.createTimeOffRequest(ctx.input.requestBody);
      return {
        output: { result },
        message: `Created time-off request.`
      };
    }

    if (action === 'update_request') {
      if (!ctx.input.requestId) throw createApiServiceError('requestId is required.');
      if (
        !ctx.input.requestBody ||
        typeof ctx.input.requestBody !== 'object' ||
        Array.isArray(ctx.input.requestBody)
      ) {
        throw createApiServiceError('Provide a requestBody object for update_request.');
      }
      let result = await client.updateTimeOffRequest(
        ctx.input.requestId,
        ctx.input.requestBody
      );
      return {
        output: { result },
        message: `Updated time-off request **${ctx.input.requestId}**.`
      };
    }

    if (action === 'update_balance') {
      if (!ctx.input.policyTypeId) throw createApiServiceError('policyTypeId is required.');
      if (!ctx.input.userId) throw createApiServiceError('userId is required.');
      if (typeof ctx.input.balanceBody?.balance !== 'number') {
        throw createApiServiceError('balanceBody.balance must be a number.');
      }
      let result = await client.updateTimeOffBalance(
        ctx.input.policyTypeId,
        ctx.input.userId,
        ctx.input.balanceBody
      );
      return {
        output: { result },
        message: `Updated balance for user **${ctx.input.userId}** on policy **${ctx.input.policyTypeId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
