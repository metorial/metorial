import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      reimbursement: z.any().describe('Full reimbursement object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let reimbursement = await client.getReimbursement(ctx.input.reimbursementId);

    return {
      output: { reimbursement },
      message: `Retrieved reimbursement **${ctx.input.reimbursementId}** — ${reimbursement.merchant_name || 'unknown merchant'}, amount: ${reimbursement.amount}`
    };
  })
  .build();
