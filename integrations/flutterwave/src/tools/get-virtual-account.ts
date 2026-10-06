import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getVirtualAccount = SlateTool.create(spec, {
  name: 'Get Virtual Account',
  key: 'get_virtual_account',
  description:
    'Read a virtual account by its exact order reference. Returns account details and expiry when supplied; it does not prove a payment was collected.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      orderRef: z.string().describe('Exact orderRef returned by create_virtual_account')
    })
  )
  .output(
    z.object({
      orderRef: z.string(),
      accountNumber: z.string(),
      bankName: z.string(),
      amount: z.number().optional(),
      expiryDate: z.string().optional(),
      createdAt: z.string().optional(),
      responseCode: z.string().optional(),
      responseMessage: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    }).getVirtualAccount(ctx.input.orderRef);
    const account = result.data;
    return {
      output: {
        orderRef: account.order_ref,
        accountNumber: account.account_number,
        bankName: account.bank_name,
        amount: account.amount,
        expiryDate: account.expiry_date,
        createdAt: account.created_at,
        responseCode: account.response_code,
        responseMessage: account.response_message
      },
      message:
        'Virtual account details retrieved. Verify a matching transaction separately to confirm collection.'
    };
  })
  .build();
