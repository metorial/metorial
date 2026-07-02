import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let addContribution = SlateTool.create(spec, {
  name: 'Add Contribution',
  key: 'add_contribution',
  description: `Record a financial contribution (donation/gift). Supports specifying the donor, amount, fund allocations (including split-fund gifts), payment method, batch grouping, and a unique external ID for donor matching.`,
  instructions: [
    "Fund names are auto-created if they don't already exist.",
    'Contributions with the same group identifier are placed into the same batch.',
    'The uid field links subsequent gifts to the same donor profile automatically.'
  ]
})
  .input(
    z.object({
      date: z.string().describe('Date of the contribution (YYYY-MM-DD format)'),
      donorFirstName: z.string().optional().describe('Donor first name'),
      donorLastName: z.string().optional().describe('Donor last name'),
      donorEmail: z.string().optional().describe('Donor email address'),
      uid: z
        .string()
        .optional()
        .describe(
          'Unique external ID for the donor (for automatic donor matching across gifts)'
        ),
      processor: z.string().optional().describe('Name of the payment processor'),
      method: z
        .string()
        .optional()
        .describe(
          'Payment method (e.g., "Credit Card", "Cash", "Check"). Auto-created if new.'
        ),
      amount: z.string().optional().describe('Total contribution amount'),
      funds: z
        .array(
          z.object({
            name: z.string().describe('Fund name'),
            amount: z.string().describe('Amount allocated to this fund')
          })
        )
        .optional()
        .describe('Fund allocations for split-fund gifts'),
      group: z
        .string()
        .optional()
        .describe('Group identifier for batching contributions together'),
      batchName: z.string().optional().describe('Descriptive name for the batch')
    })
  )
  .output(
    z.object({
      contribution: z.any().describe('The created contribution record')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let personJson: string | undefined;
    if (ctx.input.donorFirstName || ctx.input.donorLastName || ctx.input.donorEmail) {
      let person: Record<string, string> = {};
      if (ctx.input.donorFirstName) person.first = ctx.input.donorFirstName;
      if (ctx.input.donorLastName) person.last = ctx.input.donorLastName;
      if (ctx.input.donorEmail) person.email = ctx.input.donorEmail;
      personJson = JSON.stringify(person);
    }

    let fundsJson: string | undefined;
    if (ctx.input.funds?.length) {
      fundsJson = JSON.stringify(ctx.input.funds);
    }

    let result = await client.addContribution({
      date: ctx.input.date,
      personJson,
      uid: ctx.input.uid,
      processor: ctx.input.processor,
      method: ctx.input.method,
      amount: ctx.input.amount,
      fundsJson,
      group: ctx.input.group,
      batchName: ctx.input.batchName
    });

    return {
      output: { contribution: result },
      message: `Added contribution of ${ctx.input.amount || 'unspecified amount'} on ${ctx.input.date}.`
    };
  })
  .build();
