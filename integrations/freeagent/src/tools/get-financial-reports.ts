import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let getProfitAndLoss = SlateTool.create(spec, {
  name: 'Profit & Loss Report',
  key: 'get_profit_and_loss',
  description: `Retrieve the Profit & Loss summary report from FreeAgent for a given date range. Returns income, expenses, operating profit, deductions, and retained profit. Date range must be within 12 months or a single accounting year.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fromDate: z
        .string()
        .optional()
        .describe('Start date in YYYY-MM-DD format (defaults to accounting year start)'),
      toDate: z
        .string()
        .optional()
        .describe('End date in YYYY-MM-DD format (defaults to today)')
    })
  )
  .output(
    z.object({
      report: z.record(z.string(), z.any()).describe('The Profit & Loss summary data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let report = await client.getProfitAndLoss(ctx.input);

    return {
      output: { report },
      message: `Retrieved P&L report${ctx.input.fromDate ? ` from ${ctx.input.fromDate}` : ''}${ctx.input.toDate ? ` to ${ctx.input.toDate}` : ''}.`
    };
  })
  .build();

export let getBalanceSheet = SlateTool.create(spec, {
  name: 'Balance Sheet Report',
  key: 'get_balance_sheet',
  description: `Retrieve the Balance Sheet report from FreeAgent. Returns capital assets, current assets, current liabilities, net current assets, and owner's equity as at a specific date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      asAtDate: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)')
    })
  )
  .output(
    z.object({
      report: z.record(z.string(), z.any()).describe('The Balance Sheet data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let report = await client.getBalanceSheet(ctx.input);

    return {
      output: { report },
      message: `Retrieved Balance Sheet${ctx.input.asAtDate ? ` as at ${ctx.input.asAtDate}` : ''}.`
    };
  })
  .build();

export let getTrialBalance = SlateTool.create(spec, {
  name: 'Trial Balance Report',
  key: 'get_trial_balance',
  description: `Retrieve the Trial Balance summary from FreeAgent, listing all categories with their balances for a given date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fromDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      toDate: z.string().optional().describe('End date in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      report: z.record(z.string(), z.any()).describe('The Trial Balance summary data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let report = await client.getTrialBalance(ctx.input);

    return {
      output: { report },
      message: `Retrieved Trial Balance${ctx.input.fromDate ? ` from ${ctx.input.fromDate}` : ''}${ctx.input.toDate ? ` to ${ctx.input.toDate}` : ''}.`
    };
  })
  .build();
