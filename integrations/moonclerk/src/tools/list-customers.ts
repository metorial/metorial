import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { customerSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listCustomersTool = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Retrieve customer/plan subscription data with optional filters. Customers represent recurring payment plans in MoonClerk. Filter by form, checkout date range, next payment date range, or subscription status.`,
  instructions: [
    'In MoonClerk, "Customers" in the API correspond to "Plans" in the web UI.',
    'Dates for filtering must be in YYYY-MM-DD format (UTC).',
    'By default returns 10 results. Use count (1-100) and offset for pagination.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.number().optional().describe('Filter by MoonClerk form ID'),
      checkoutFrom: z
        .string()
        .optional()
        .describe('Filter by checkout start date (YYYY-MM-DD, UTC)'),
      checkoutTo: z
        .string()
        .optional()
        .describe('Filter by checkout end date (YYYY-MM-DD, UTC)'),
      nextPaymentFrom: z
        .string()
        .optional()
        .describe('Filter by next payment start date (YYYY-MM-DD, UTC)'),
      nextPaymentTo: z
        .string()
        .optional()
        .describe('Filter by next payment end date (YYYY-MM-DD, UTC)'),
      status: z
        .enum(['active', 'canceled', 'expired', 'past_due', 'pending', 'unpaid'])
        .optional()
        .describe('Filter by subscription status'),
      count: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results to return (1-100, default 10)'),
      offset: z.number().optional().describe('Starting position for pagination')
    })
  )
  .output(
    z.object({
      customers: z.array(customerSchema).describe('List of customer/plan records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let customers = await client.listCustomers({
      formId: ctx.input.formId,
      checkoutFrom: ctx.input.checkoutFrom,
      checkoutTo: ctx.input.checkoutTo,
      nextPaymentFrom: ctx.input.nextPaymentFrom,
      nextPaymentTo: ctx.input.nextPaymentTo,
      status: ctx.input.status,
      count: ctx.input.count,
      offset: ctx.input.offset
    });

    return {
      output: { customers },
      message: `Retrieved **${customers.length}** customer(s).`
    };
  })
  .build();
