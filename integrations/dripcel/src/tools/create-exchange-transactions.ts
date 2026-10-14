import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createExchangeTransactions = SlateTool.create(spec, {
  name: 'Create Exchange Transactions',
  key: 'create_exchange_transactions',
  description:
    'Confirm marketplace leads as a buyer. Each lead creates a transaction attributed to an offer your organization owns, with an optional initial status.',
  instructions: [
    'Provide exactly one of campaignId, sendId, or clickId for each lead.',
    'Use manage_exchange_transactions to search for the final status after submission.'
  ],
  constraints: [
    'Submit 1 to 1,000 leads per request. Requires marketplace_transaction.create permission.',
    'Completed transactions deduct credits and credit the seller. Duplicates may be rejected and capped offers may remain pending regardless of the requested status.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      leads: z
        .array(
          z.object({
            resourceId: z
              .string()
              .min(1)
              .describe('Buyer-supplied unique lead ID for audit and idempotency'),
            cell: z
              .string()
              .min(1)
              .describe('Contact cell number in local or international format'),
            campaignId: z
              .string()
              .min(1)
              .optional()
              .describe('Marketplace campaign ID for attribution'),
            sendId: z.string().min(1).optional().describe('Send ID for attribution'),
            clickId: z.string().min(1).optional().describe('Click ID for attribution'),
            status: z
              .enum(['completed', 'pending', 'rejected'])
              .optional()
              .describe(
                'Initial status. Omit to use the offer default; provider protections can override it.'
              )
          })
        )
        .min(1)
        .max(1000)
        .describe('Marketplace leads to confirm')
    })
  )
  .output(
    z.object({
      submitted: z.boolean().describe('Whether Dripcel accepted the submission'),
      count: z.number().describe('Number of leads submitted'),
      providerMessage: z.string().describe('Submission acknowledgement from Dripcel')
    })
  )
  .handleInvocation(async ctx => {
    for (let [index, lead] of ctx.input.leads.entries()) {
      if (
        [lead.campaignId, lead.sendId, lead.clickId].filter(value => value !== undefined)
          .length !== 1
      ) {
        throw createApiServiceError(
          `Lead ${index + 1} must provide exactly one of campaignId, sendId, or clickId.`
        );
      }
    }
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createTransactions(ctx.input.leads);
    if (typeof result.data !== 'string') {
      throw createApiServiceError(
        'Dripcel did not return a lead submission acknowledgement. Search transactions before retrying.'
      );
    }
    return {
      output: { submitted: true, count: ctx.input.leads.length, providerMessage: result.data },
      message: `Submitted **${ctx.input.leads.length}** marketplace lead(s). Search transactions to confirm their status.`
    };
  })
  .build();
