import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { recordSchema } from '../lib/validation';
import { spec } from '../spec';

export let getReimbursement = SlateTool.create(spec, {
  name: 'Get Reimbursement',
  key: 'get_reimbursement',
  description: `Retrieve details of a specific reimbursement by ID. Returns full reimbursement data including amount, currency, employee info, merchant, line items, mileage/trip details, and approval status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reimbursementId: z.string().describe('Unique identifier of the reimbursement')
    })
  )
  .output(
    z.object({
      reimbursement: recordSchema.describe('Full reimbursement object')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let reimbursement = await client.getReimbursement(ctx.input.reimbursementId);

    return {
      output: { reimbursement },
      message: `Retrieved reimbursement **${ctx.input.reimbursementId}** — ${reimbursement.merchant_name || 'unknown merchant'}, amount: ${reimbursement.amount}`
    };
  })
  .build();
