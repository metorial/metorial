import { SlateTool } from 'slates';
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
        .describe('Policy type ID (for get_balances, update_balance)'),
      userId: z.number().optional().describe('User ID (for update_balance)'),
      requestId: z.string().optional().describe('Time-off request ID (for update_request)'),
      requestBody: z
        .any()
        .optional()
        .describe('Request body for create_request or update_request'),
      balanceBody: z.any().optional().describe('Balance update body for update_balance'),
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
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
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
      if (!ctx.input.policyTypeId) throw new Error('policyTypeId is required.');
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
      let result = await client.createTimeOffRequest(ctx.input.requestBody);
      return {
        output: { result },
        message: `Created time-off request.`
      };
    }

    if (action === 'update_request') {
      if (!ctx.input.requestId) throw new Error('requestId is required.');
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
      if (!ctx.input.policyTypeId) throw new Error('policyTypeId is required.');
      if (!ctx.input.userId) throw new Error('userId is required.');
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

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
