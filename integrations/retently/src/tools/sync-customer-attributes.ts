import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let syncCustomerAttributes = SlateTool.create(spec, {
  name: 'Sync Customer Attributes',
  key: 'sync_customer_attributes',
  description:
    'Queue a refresh of customer profile snapshots on existing feedback and outbox records after updating customers. Provide customer IDs or emails. This reuses current customer data; inspect get_feedback or get_outbox afterward to observe completion.',
  constraints: [
    'Provide exactly one of customerIds or emails; at most 1,000 customers per request.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      customerIds: z
        .array(z.string())
        .min(1)
        .max(1000)
        .optional()
        .describe('Customer IDs from get_customers. Mutually exclusive with emails.'),
      emails: z
        .array(z.string())
        .min(1)
        .max(1000)
        .optional()
        .describe('Customer emails. Mutually exclusive with customerIds.'),
      scope: z
        .enum(['feedback', 'outbox', 'all'])
        .optional()
        .describe('Records to refresh (default: all)')
    })
  )
  .output(
    z.object({
      result: z
        .any()
        .describe(
          'Queue acceptance, matched customers, and job IDs; completion is asynchronous'
        )
    })
  )
  .handleInvocation(async ctx => {
    if (
      Number(ctx.input.customerIds !== undefined) + Number(ctx.input.emails !== undefined) !==
      1
    ) {
      throw createApiServiceError('Provide exactly one of customerIds or emails.');
    }
    let result = await new Client(ctx.auth.token).syncAttributes({
      customers: ctx.input.customerIds,
      emails: ctx.input.emails,
      scope: ctx.input.scope
    });
    return {
      output: { result },
      message:
        'Customer snapshot refresh queued. Updated records become visible after the jobs finish.'
    };
  })
  .build();
