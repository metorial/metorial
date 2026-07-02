import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createCustomersBulk = SlateTool.create(spec, {
  name: 'Create Customers (Bulk)',
  key: 'create_customers_bulk',
  description: `Import multiple customers at once for a business location. Supports up to 1000 customers per request. Useful for syncing a batch of customers from CRM or POS systems.`,
  constraints: [
    'Maximum 1000 customers per request.',
    'Either email or phone is required per customer depending on subscription plan.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      businessId: z.number().describe('Business ID to associate customers with'),
      customers: z
        .array(
          z.object({
            email: z.string().optional().describe('Customer email'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            phone: z.string().optional().describe('Phone number'),
            customId: z.string().optional().describe('Custom identifier'),
            jobId: z.string().optional().describe('Job identifier'),
            preference: z
              .enum(['email', 'sms'])
              .optional()
              .describe('Communication preference'),
            tags: z.string().optional().describe('Comma-separated tags')
          })
        )
        .describe('List of customers to create (max 1000)')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            customerId: z.number().optional().describe('Created customer ID'),
            errorCode: z
              .number()
              .optional()
              .describe('Error code for this customer (0 = success)'),
            errorMessage: z.string().optional().describe('Error message for this customer')
          })
        )
        .describe('Per-customer creation results'),
      overallSuccess: z.boolean().describe('Whether the overall request succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.createCustomersBulk({
      businessId: ctx.input.businessId,
      customers: ctx.input.customers
    });

    if (data.errorCode !== 0 && data.errorCode !== undefined) {
      throw new Error(
        `Bulk customer creation failed: ${data.errorMessage} (code: ${data.errorCode})`
      );
    }

    let results: Record<string, unknown>[] = [];
    for (let i = 1; i <= ctx.input.customers.length; i++) {
      results.push({
        customerId: data[`customerId${i}`],
        errorCode: data[`customerErrorCode${i}`],
        errorMessage: data[`customerErrorMessage${i}`]
      });
    }

    let successCount = results.filter(r => r.errorCode === 0).length;

    return {
      output: {
        results,
        overallSuccess: data.errorCode === 0
      } as any,
      message: `Bulk import: **${successCount}/${ctx.input.customers.length}** customers created successfully for business **${ctx.input.businessId}**.`
    };
  })
  .build();
