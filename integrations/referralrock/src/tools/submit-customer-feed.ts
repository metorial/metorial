import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

let customerSchema = z.object({
  email: z
    .string()
    .min(1)
    .describe('Customer email address used to match referrals and members'),
  externalId: z.string().optional().describe('Customer ID in your external system'),
  firstName: z.string().optional().describe('Customer first name'),
  lastName: z.string().optional().describe('Customer last name'),
  phone: z.string().optional().describe('Customer phone number'),
  addressLine1: z.string().optional().describe('Street address'),
  addressLine2: z.string().optional().describe('Address line 2'),
  city: z.string().optional().describe('City'),
  region: z.string().optional().describe('Region name or ISO 3166-2 subdivision code'),
  postalCode: z.string().optional().describe('Postal code'),
  amount: z
    .number()
    .optional()
    .describe('Purchase amount for reward calculation; defaults to 0'),
  purchaseDate: z
    .string()
    .optional()
    .describe('Purchase date in ISO 8601 format; defaults to server UTC time')
});

export let submitCustomerFeed = SlateTool.create(spec, {
  name: 'Submit Customer Feed',
  key: 'submit_customer_feed',
  description:
    'Submit up to 10 customers to approve matching referrals and trigger configured rewards. Depending on account settings, unmatched customers may be added as preloaded members. Each customer has a separate outcome.',
  instructions: [
    'This can approve referrals and trigger rewards. Review the per-customer statusCategory and message for skipped or failed records.',
    'For larger imports, use the provider admin CSV import.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      customers: z
        .array(customerSchema)
        .min(1)
        .max(10)
        .describe('One to ten customers to process')
    })
  )
  .output(
    z.object({
      submittedCount: z.number().describe('Number of customers submitted'),
      results: z
        .array(
          z.object({
            email: z.string().optional().describe('Customer email correlation key'),
            externalId: z.string().optional().describe('External customer ID'),
            status: z.string().optional().describe('Detailed per-customer outcome'),
            statusCategory: z
              .string()
              .optional()
              .describe('Approved, Updated, Preloaded, Skipped, or Error'),
            message: z.string().optional().describe('Outcome details'),
            amount: z.number().optional().describe('Purchase amount'),
            purchaseDate: z.string().optional().describe('Purchase date')
          })
        )
        .describe('Outcomes in the same order as the submitted customers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReferralRockClient({ token: ctx.auth.token });
    let records = await client.submitCustomerFeed(ctx.input.customers);
    let results = records.map(record => ({
      email: record.email as string | undefined,
      externalId: record.externalId as string | undefined,
      status: record.status as string | undefined,
      statusCategory: record.statusCategory as string | undefined,
      message: record.message as string | undefined,
      amount: record.amount as number | undefined,
      purchaseDate: record.purchaseDate as string | undefined
    }));
    return {
      output: { submittedCount: ctx.input.customers.length, results },
      message: `Received **${results.length}** customer feed outcome(s). Review each outcome for approved, skipped, or failed processing.`
    };
  })
  .build();
