import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSpendProgram = SlateTool.create(spec, {
  name: 'Manage Spend Program',
  key: 'manage_spend_program',
  description: `List, get, create, or update Ramp spend programs. Spend programs group funds, users, and cards under shared policies, acting as "blueprints" for consistent spending rules and automated fund provisioning.`,
  instructions: [
    'Amounts are in cents (e.g. 1000000 = $10,000.00)',
    "When a spend program is linked to a limit, it overrides the limit's spending restrictions"
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'update']).describe('Action to perform'),
      spendProgramId: z
        .string()
        .optional()
        .describe('Spend program ID (required for get, update)'),
      cursor: z.string().optional().describe('Pagination cursor (for list)'),
      pageSize: z.number().min(2).max(100).optional().describe('Results per page (for list)'),
      displayName: z.string().optional().describe('Program display name'),
      description: z.string().optional().describe('Program description'),
      icon: z.string().optional().describe('Icon identifier (e.g. TeamSocialIcon)'),
      isShareable: z.boolean().optional().describe('Whether the program is shareable'),
      primaryCardEnabled: z
        .boolean()
        .optional()
        .describe('Whether primary card spending is enabled'),
      reimbursementsEnabled: z
        .boolean()
        .optional()
        .describe('Whether reimbursements are enabled'),
      amount: z.number().optional().describe('Spending limit amount in cents'),
      currencyCode: z.string().optional().describe('Currency code (e.g. USD)'),
      interval: z
        .string()
        .optional()
        .describe('Spending interval (e.g. DAILY, MONTHLY, ANNUAL, TOTAL)'),
      allowedCategories: z
        .array(z.number())
        .optional()
        .describe('Allowed merchant category codes')
    })
  )
  .output(
    z.object({
      spendProgram: z.any().optional().describe('Single spend program object'),
      spendPrograms: z.array(z.any()).optional().describe('List of spend program objects'),
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
      let result = await client.listSpendPrograms({
        start: ctx.input.cursor,
        pageSize: ctx.input.pageSize
      });
      return {
        output: {
          spendPrograms: result.data,
          nextCursor: result.page?.next
        },
        message: `Retrieved **${result.data.length}** spend programs${result.page?.next ? ' (more pages available)' : ''}.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.spendProgramId)
        throw new Error('spendProgramId is required for get action');
      let spendProgram = await client.getSpendProgram(ctx.input.spendProgramId);
      return {
        output: { spendProgram },
        message: `Retrieved spend program **${spendProgram.display_name || ctx.input.spendProgramId}**.`
      };
    }

    let buildBody = () => {
      let body: Record<string, any> = {};
      if (ctx.input.displayName) body.display_name = ctx.input.displayName;
      if (ctx.input.description) body.description = ctx.input.description;
      if (ctx.input.icon) body.icon = ctx.input.icon;
      if (ctx.input.isShareable !== undefined) body.is_shareable = ctx.input.isShareable;

      if (
        ctx.input.primaryCardEnabled !== undefined ||
        ctx.input.reimbursementsEnabled !== undefined
      ) {
        body.permitted_spend_types = {};
        if (ctx.input.primaryCardEnabled !== undefined)
          body.permitted_spend_types.primary_card_enabled = ctx.input.primaryCardEnabled;
        if (ctx.input.reimbursementsEnabled !== undefined)
          body.permitted_spend_types.reimbursements_enabled = ctx.input.reimbursementsEnabled;
      }

      if (
        ctx.input.amount !== undefined ||
        ctx.input.currencyCode ||
        ctx.input.interval ||
        ctx.input.allowedCategories
      ) {
        body.spending_restrictions = {};
        if (ctx.input.amount !== undefined || ctx.input.currencyCode) {
          body.spending_restrictions.limit = {};
          if (ctx.input.amount !== undefined)
            body.spending_restrictions.limit.amount = ctx.input.amount;
          if (ctx.input.currencyCode)
            body.spending_restrictions.limit.currency_code = ctx.input.currencyCode;
        }
        if (ctx.input.interval) body.spending_restrictions.interval = ctx.input.interval;
        if (ctx.input.allowedCategories)
          body.spending_restrictions.allowed_categories = ctx.input.allowedCategories;
      }

      return body;
    };

    if (action === 'create') {
      let spendProgram = await client.createSpendProgram(buildBody());
      return {
        output: { spendProgram },
        message: `Created spend program **${ctx.input.displayName || 'new program'}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.spendProgramId)
        throw new Error('spendProgramId is required for update action');
      let spendProgram = await client.updateSpendProgram(
        ctx.input.spendProgramId,
        buildBody()
      );
      return {
        output: { spendProgram },
        message: `Updated spend program **${ctx.input.spendProgramId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
