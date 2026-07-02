import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEstimate = SlateTool.create(spec, {
  name: 'Create Estimate',
  key: 'create_estimate',
  description: `Create a new estimate in Agiled. Specify the client, valid dates, and amounts for a quote or proposal.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      clientId: z.string().describe('ID of the client for the estimate'),
      validTill: z.string().describe('Estimate valid until date (YYYY-MM-DD)'),
      estimateDate: z.string().optional().describe('Estimate date (YYYY-MM-DD)'),
      currencyId: z.string().optional().describe('Currency ID'),
      notes: z.string().optional().describe('Notes for the estimate'),
      status: z
        .string()
        .optional()
        .describe('Estimate status (e.g. "draft", "sent", "accepted", "declined")'),
      subTotal: z.number().optional().describe('Subtotal amount'),
      total: z.number().optional().describe('Total amount'),
      discount: z.number().optional().describe('Discount amount or percentage'),
      discountType: z.enum(['percent', 'fixed']).optional().describe('Discount type')
    })
  )
  .output(
    z.object({
      estimateId: z.string().describe('ID of the created estimate'),
      estimateNumber: z.string().optional().describe('Estimate number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    let result = await client.createEstimate({
      client_id: ctx.input.clientId,
      valid_till: ctx.input.validTill,
      estimate_date: ctx.input.estimateDate,
      currency_id: ctx.input.currencyId,
      note: ctx.input.notes,
      status: ctx.input.status,
      sub_total: ctx.input.subTotal,
      total: ctx.input.total,
      discount: ctx.input.discount,
      discount_type: ctx.input.discountType
    });

    let estimate = result.data;

    return {
      output: {
        estimateId: String(estimate.id ?? ''),
        estimateNumber: estimate.estimate_number as string | undefined
      },
      message: `Created estimate${estimate.estimate_number ? ` #${estimate.estimate_number}` : ''} for client **${ctx.input.clientId}**.`
    };
  })
  .build();
