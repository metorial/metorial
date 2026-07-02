import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageIncentives = SlateTool.create(spec, {
  name: 'Manage Incentives',
  key: 'manage_incentives',
  description: `Create, update, delete, or list one-time and recurring incentives (bonuses, commissions, etc.) for employees. One-time incentives have a single effective date, while recurring incentives repeat monthly within a date range.`,
  instructions: [
    'Use action "create" for a one-time incentive.',
    'Use action "create_recurring" for a monthly recurring incentive.',
    'Use action "update" to modify an existing one-time incentive.',
    'Use action "delete" to remove a one-time incentive (only if not yet processing or paid).',
    'Use action "delete_recurring" to remove a recurring incentive.',
    'Use action "list" to list one-time incentives; "list_recurring" for recurring ones.',
    'Use action "get" to retrieve a single one-time incentive.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'create_recurring',
          'update',
          'delete',
          'delete_recurring',
          'list',
          'list_recurring',
          'get'
        ])
        .describe('Action to perform'),
      incentiveId: z.string().optional().describe('Incentive ID (for get, update, delete)'),
      recurringIncentiveId: z
        .string()
        .optional()
        .describe('Recurring incentive ID (for delete_recurring)'),
      employmentId: z
        .string()
        .optional()
        .describe('Employment ID (for create, create_recurring, list, list_recurring)'),
      amount: z.number().optional().describe('Incentive amount'),
      amountTaxType: z.string().optional().describe('Tax type: "gross" or "net"'),
      type: z
        .string()
        .optional()
        .describe('Incentive type (e.g., bonus, commission, signing_bonus)'),
      effectiveDate: z
        .string()
        .optional()
        .describe('Effective date for one-time incentive (YYYY-MM-DD)'),
      startDate: z
        .string()
        .optional()
        .describe('Start date for recurring incentive (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('End date for recurring incentive (YYYY-MM-DD)'),
      note: z.string().optional().describe('Optional note/description'),
      currency: z.string().optional().describe('Currency code (e.g., USD, EUR)'),
      status: z.string().optional().describe('Filter by status when listing'),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Page size')
    })
  )
  .output(
    z.object({
      incentive: z.record(z.string(), z.any()).optional().describe('Single incentive record'),
      incentives: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of incentive records'),
      totalCount: z.number().optional().describe('Total count for list'),
      deleted: z.boolean().optional().describe('Whether the delete was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.auth.environment ?? 'production'
    });

    if (ctx.input.action === 'create') {
      let result = await client.createIncentive({
        employmentId: ctx.input.employmentId!,
        amount: ctx.input.amount!,
        amountTaxType: ctx.input.amountTaxType!,
        type: ctx.input.type!,
        effectiveDate: ctx.input.effectiveDate!,
        note: ctx.input.note,
        currency: ctx.input.currency
      });
      let incentive = result?.data ?? result?.incentive ?? result;
      return {
        output: { incentive },
        message: `Created one-time incentive of **${ctx.input.amount} ${ctx.input.currency ?? ''}** (${ctx.input.type}).`
      };
    }

    if (ctx.input.action === 'create_recurring') {
      let result = await client.createRecurringIncentive({
        employmentId: ctx.input.employmentId!,
        amount: ctx.input.amount!,
        amountTaxType: ctx.input.amountTaxType!,
        type: ctx.input.type!,
        startDate: ctx.input.startDate!,
        note: ctx.input.note,
        currency: ctx.input.currency,
        endDate: ctx.input.endDate
      });
      let incentive = result?.data ?? result?.incentive ?? result;
      return {
        output: { incentive },
        message: `Created recurring incentive of **${ctx.input.amount} ${ctx.input.currency ?? ''}** (${ctx.input.type}) starting ${ctx.input.startDate}.`
      };
    }

    if (ctx.input.action === 'update') {
      let data: Record<string, any> = {};
      if (ctx.input.amount !== undefined) data.amount = ctx.input.amount;
      if (ctx.input.amountTaxType) data.amount_tax_type = ctx.input.amountTaxType;
      if (ctx.input.type) data.type = ctx.input.type;
      if (ctx.input.effectiveDate) data.effective_date = ctx.input.effectiveDate;
      if (ctx.input.note !== undefined) data.note = ctx.input.note;
      if (ctx.input.currency) data.currency = ctx.input.currency;

      let result = await client.updateIncentive(ctx.input.incentiveId!, data);
      let incentive = result?.data ?? result?.incentive ?? result;
      return {
        output: { incentive },
        message: `Updated incentive **${ctx.input.incentiveId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteIncentive(ctx.input.incentiveId!);
      return {
        output: { deleted: true },
        message: `Deleted incentive **${ctx.input.incentiveId}**.`
      };
    }

    if (ctx.input.action === 'delete_recurring') {
      await client.deleteRecurringIncentive(ctx.input.recurringIncentiveId!);
      return {
        output: { deleted: true },
        message: `Deleted recurring incentive **${ctx.input.recurringIncentiveId}**.`
      };
    }

    if (ctx.input.action === 'get') {
      let result = await client.getIncentive(ctx.input.incentiveId!);
      let incentive = result?.data ?? result?.incentive ?? result;
      return {
        output: { incentive },
        message: `Retrieved incentive **${ctx.input.incentiveId}**.`
      };
    }

    if (ctx.input.action === 'list_recurring') {
      let result = await client.listRecurringIncentives({
        employmentId: ctx.input.employmentId,
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
      let incentives = result?.data ?? result?.incentives ?? [];
      let totalCount = result?.total_count ?? incentives.length;
      return {
        output: { incentives, totalCount },
        message: `Found **${totalCount}** recurring incentive(s).`
      };
    }

    // list
    let result = await client.listIncentives({
      employmentId: ctx.input.employmentId,
      status: ctx.input.status,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });
    let incentives = result?.data ?? result?.incentives ?? [];
    let totalCount = result?.total_count ?? incentives.length;
    return {
      output: { incentives, totalCount },
      message: `Found **${totalCount}** incentive(s).`
    };
  });
