import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let trackExpense = SlateTool.create(spec, {
  name: 'Track Expense',
  key: 'track_expense',
  description: `Submit expense data for AI-powered categorization and financial analysis. Describe the expense in natural language and receive intelligent categorization, insights, and analysis.

Useful for automated bookkeeping, expense management, and financial tracking.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      expense: z
        .string()
        .describe(
          'Description of the expense in natural language, e.g. "Lunch meeting at Italian restaurant $85.50, business development"'
        )
    })
  )
  .output(
    z.object({
      expenseAnalysis: z
        .any()
        .describe('AI-categorized expense data with categorization and financial analysis')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Tracking and analyzing expense...');

    let result = await client.trackExpense({
      expense: ctx.input.expense
    });

    return {
      output: {
        expenseAnalysis: result
      },
      message: `Successfully recorded and analyzed the expense.`
    };
  })
  .build();
