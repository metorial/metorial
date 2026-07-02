import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLimit = SlateTool.create(spec, {
  name: 'Manage Limit',
  key: 'manage_limit',
  description: `List, get, create, update, or terminate spending limits (funds) in Ramp. Limits represent individual spending budgets that can be associated with cards and reimbursements.
- **list**: Retrieve limits, optionally filtered by spend program, user, or entity.
- **get**: Retrieve a specific limit by ID.
- **create**: Create a new spending limit with optional spend program linkage.
- **update**: Modify a limit's settings.
- **terminate**: Permanently terminate a limit.`,
  instructions: [
    'If spend_program_id is provided when creating, the spending restrictions of the spend program will override any provided restrictions',
    'Amounts are in cents (e.g. 100000 = $1,000.00)'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'terminate'])
        .describe('Action to perform'),
      limitId: z
        .string()
        .optional()
        .describe('Limit ID (required for get, update, terminate)'),
      cursor: z.string().optional().describe('Pagination cursor (for list)'),
      pageSize: z.number().min(2).max(100).optional().describe('Results per page (for list)'),
      spendProgramId: z
        .string()
        .optional()
        .describe('Spend program ID (for list filter or create linkage)'),
      userId: z.string().optional().describe('User ID (for list filter or create assignment)'),
      entityId: z.string().optional().describe('Entity ID (for list filter)'),
      displayName: z.string().optional().describe('Display name for the limit'),
      amount: z.number().optional().describe('Spending limit amount in cents'),
      currencyCode: z.string().optional().describe('Currency code (e.g. USD)'),
      interval: z
        .string()
        .optional()
        .describe('Spending interval (e.g. DAILY, MONTHLY, ANNUAL, TOTAL)'),
      isShareable: z
        .boolean()
        .optional()
        .describe('Whether the limit is shareable among multiple users'),
      idempotencyKey: z.string().optional().describe('Idempotency key for create/terminate')
    })
  )
  .output(
    z.object({
      limit: z.any().optional().describe('Single limit object'),
      limits: z.array(z.any()).optional().describe('List of limit objects'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listLimits({
        start: ctx.input.cursor,
        pageSize: ctx.input.pageSize,
        spendProgramId: ctx.input.spendProgramId,
        userId: ctx.input.userId,
        entityId: ctx.input.entityId
      });
      return {
        output: {
          limits: result.data,
          nextCursor: result.page?.next
        },
        message: `Retrieved **${result.data.length}** limits${result.page?.next ? ' (more pages available)' : ''}.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.limitId) throw new Error('limitId is required for get action');
      let limit = await client.getLimit(ctx.input.limitId);
      return {
        output: { limit },
        message: `Retrieved limit **${limit.display_name || ctx.input.limitId}**.`
      };
    }

    if (action === 'create') {
      let body: Record<string, any> = {};
      if (ctx.input.displayName) body.display_name = ctx.input.displayName;
      if (ctx.input.userId) body.user_id = ctx.input.userId;
      if (ctx.input.spendProgramId) body.spend_program_id = ctx.input.spendProgramId;
      if (ctx.input.isShareable !== undefined) body.is_shareable = ctx.input.isShareable;
      body.idempotency_key = ctx.input.idempotencyKey || crypto.randomUUID();

      if (ctx.input.amount !== undefined || ctx.input.currencyCode || ctx.input.interval) {
        body.spending_restrictions = {};
        if (ctx.input.amount !== undefined || ctx.input.currencyCode) {
          body.spending_restrictions.limit = {};
          if (ctx.input.amount !== undefined)
            body.spending_restrictions.limit.amount = ctx.input.amount;
          if (ctx.input.currencyCode)
            body.spending_restrictions.limit.currency_code = ctx.input.currencyCode;
        }
        if (ctx.input.interval) body.spending_restrictions.interval = ctx.input.interval;
      }

      let limit = await client.createLimit(body);
      return {
        output: { limit },
        message: `Created limit **${ctx.input.displayName || 'new limit'}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.limitId) throw new Error('limitId is required for update action');
      let body: Record<string, any> = {};
      if (ctx.input.displayName) body.display_name = ctx.input.displayName;

      if (ctx.input.amount !== undefined || ctx.input.currencyCode || ctx.input.interval) {
        body.spending_restrictions = {};
        if (ctx.input.amount !== undefined || ctx.input.currencyCode) {
          body.spending_restrictions.limit = {};
          if (ctx.input.amount !== undefined)
            body.spending_restrictions.limit.amount = ctx.input.amount;
          if (ctx.input.currencyCode)
            body.spending_restrictions.limit.currency_code = ctx.input.currencyCode;
        }
        if (ctx.input.interval) body.spending_restrictions.interval = ctx.input.interval;
      }

      let limit = await client.updateLimit(ctx.input.limitId, body);
      return {
        output: { limit },
        message: `Updated limit **${ctx.input.limitId}**.`
      };
    }

    if (action === 'terminate') {
      if (!ctx.input.limitId) throw new Error('limitId is required for terminate action');
      let limit = await client.terminateLimit(
        ctx.input.limitId,
        ctx.input.idempotencyKey || crypto.randomUUID()
      );
      return {
        output: { limit },
        message: `Terminated limit **${ctx.input.limitId}** permanently.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
