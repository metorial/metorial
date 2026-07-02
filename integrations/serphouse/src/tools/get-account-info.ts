import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve SERPHouse account information including active plan details, credit usage, and available credits for both live and scheduled API calls.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      status: z.string().describe('Response status'),
      name: z.string().optional().describe('Account holder name'),
      email: z.string().optional().describe('Account email'),
      plan: z
        .object({
          planName: z.string().optional().describe('Active plan name'),
          planType: z.string().optional().describe('Plan type'),
          price: z.string().optional().describe('Plan price')
        })
        .optional()
        .describe('Active subscription plan details'),
      credits: z
        .object({
          available: z.number().optional().describe('Available live API credits'),
          total: z.number().optional().describe('Total live API credits'),
          scheduledAvailable: z
            .number()
            .optional()
            .describe('Available scheduled API credits'),
          scheduledTotal: z.number().optional().describe('Total scheduled API credits')
        })
        .optional()
        .describe('Credit usage information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.getAccountInfo();
    let results = response?.results;

    return {
      output: {
        status: response?.status ?? 'unknown',
        name: results?.name,
        email: results?.email,
        plan: results?.plan
          ? {
              planName: results.plan.name,
              planType: results.plan.type,
              price: results.plan.price
            }
          : undefined,
        credits: results?.credit
          ? {
              available: results.credit.available,
              total: results.credit.total,
              scheduledAvailable: results.credit.scheduled_available,
              scheduledTotal: results.credit.scheduled_total
            }
          : undefined
      },
      message: `Account: **${results?.name ?? 'N/A'}** (${results?.email ?? 'N/A'}). Credits: ${results?.credit?.available ?? 'N/A'}/${results?.credit?.total ?? 'N/A'} live, ${results?.credit?.scheduled_available ?? 'N/A'}/${results?.credit?.scheduled_total ?? 'N/A'} scheduled.`
    };
  })
  .build();
