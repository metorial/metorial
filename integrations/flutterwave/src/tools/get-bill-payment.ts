import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getBillPayment = SlateTool.create(spec, {
  name: 'Get Bill Payment',
  key: 'get_bill_payment',
  description:
    'Query a bill payment using its transaction reference with provider status requested. The API response envelope indicates retrieval success, not delivery of the purchased service.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      reference: z
        .string()
        .describe('tx_ref returned by pay_bill; distinct from the provider reference')
    })
  )
  .output(
    z.object({
      reference: z.string(),
      providerReference: z.string().optional(),
      customerReference: z.string().optional(),
      processingStatus: z
        .string()
        .optional()
        .describe('Provider processing status, only when returned'),
      currency: z.string().optional(),
      amount: z.number().optional(),
      fee: z.number().optional(),
      product: z.string().optional(),
      rechargeToken: z
        .string()
        .optional()
        .describe('Prepaid utility redemption token, when returned by the provider'),
      country: z.string().optional(),
      transactionDate: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    }).getBillPaymentStatus(ctx.input.reference);
    const bill = result.data;
    if (bill.tx_ref !== ctx.input.reference)
      throw createApiServiceError(
        'Bill readback did not return the requested transaction reference.'
      );
    return {
      output: {
        reference: bill.tx_ref,
        providerReference: bill.flw_ref,
        customerReference: bill.customer_reference,
        processingStatus: typeof bill.status === 'string' ? bill.status : undefined,
        currency: bill.currency,
        amount: bill.amount,
        fee: bill.fee,
        product: bill.product,
        rechargeToken: typeof bill.extra === 'string' ? bill.extra : undefined,
        country: bill.country,
        transactionDate: bill.transaction_date
      },
      message: bill.status
        ? `Bill payment provider status: ${bill.status}.`
        : 'Bill payment details retrieved; the provider did not return a processing status, so completion is unconfirmed.'
    };
  })
  .build();
