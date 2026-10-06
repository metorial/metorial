import { z } from 'zod';
import { mapPayment, paymentOutput } from '../lib/schemas';
import { tool } from '../lib/tool';
import {
  date,
  dateInput,
  decimal,
  decimalInput,
  idInput,
  resource,
  routeId
} from '../lib/validation';
export const paymentMethod = z.enum([
  'credit_card',
  'cash',
  'wire_transfer',
  'direct_debit',
  'check',
  'iou',
  'paypal',
  'other',
  'credit',
  'offset'
]);
export const recordPayment = tool({
  name: 'Record Payment',
  key: 'record_payment',
  description:
    'Record a payment or refund already made for a document. This does not transfer money. Recording can finalize the financial document. Omitted amount follows provider defaults; provide an explicit amount for partial payments. Expenses use the historical route, whose current support is undocumented and must be verified for the account.',
  input: {
    documentType: z.enum(['invoices', 'credits', 'expenses']),
    documentId: idInput,
    amount: decimalInput.optional(),
    date: dateInput.optional(),
    paymentMethod: paymentMethod.optional()
  },
  output: paymentOutput,
  run: async (input, client) => {
    await client.get(input.documentType, input.documentId);
    const compatibility = input.documentType === 'expenses';
    return mapPayment(
      resource(
        await client.request(
          'POST',
          `${input.documentType}/${routeId(input.documentId)}/payments${compatibility ? '.json' : ''}`,
          {
            amount: input.amount === undefined ? undefined : decimal(input.amount),
            date: input.date === undefined ? undefined : date(input.date),
            payment_method: input.paymentMethod
          },
          undefined,
          compatibility
        )
      )
    );
  }
});
export const deletePayment = tool({
  name: 'Delete Payment (Compatibility)',
  key: 'delete_payment',
  description:
    'Delete a payment record using the historical route. Current deletion support is undocumented. This does not reverse a bank or processor transfer or guarantee the parent document becomes editable.',
  destructive: true,
  input: {
    documentType: z.enum(['invoices', 'credits', 'expenses']),
    documentId: idInput,
    paymentId: idInput
  },
  output: { success: z.boolean() },
  run: async (input, client) => {
    await client.request(
      'DELETE',
      `${input.documentType}/${routeId(input.documentId)}/payments/${routeId(input.paymentId)}.json`,
      undefined,
      undefined,
      true
    );
    return { success: true };
  }
});
