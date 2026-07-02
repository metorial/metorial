import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let managePaymentsTool = SlateTool.create(spec, {
  name: 'Manage Payments',
  key: 'manage_payments',
  description: `View payments for a job or record new payments. Supports received payments, paid (outgoing) payments, and additional job expenses. Without a payment type specified, retrieves the payment list and overview for the job.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The unique ID of the job'),
      paymentType: z
        .enum(['received', 'paid', 'additional_expense'])
        .optional()
        .describe('Type of payment to record. Omit to view existing payments.'),
      amount: z
        .number()
        .optional()
        .describe('Payment amount (required when creating a payment)'),
      date: z.string().optional().describe('Payment date in YYYY-MM-DD format'),
      paymentMethod: z
        .string()
        .optional()
        .describe('Payment method (for received/paid payments)'),
      referenceNumber: z
        .string()
        .optional()
        .describe('Reference or check number (for received/paid payments)'),
      accountTypeId: z.string().optional().describe('Account type ID'),
      description: z.string().optional().describe('Description or notes')
    })
  )
  .output(
    z.object({
      payments: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of existing payments'),
      overview: z.record(z.string(), z.any()).optional().describe('Payment overview/summary'),
      createdPayment: z
        .record(z.string(), z.any())
        .optional()
        .describe('The newly created payment record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { jobId, paymentType } = ctx.input;

    if (paymentType && ctx.input.amount !== undefined) {
      let createdPayment: any;

      if (paymentType === 'received') {
        createdPayment = await client.createReceivedPayment(jobId, {
          amount: ctx.input.amount,
          date: ctx.input.date,
          paymentMethod: ctx.input.paymentMethod,
          referenceNumber: ctx.input.referenceNumber,
          accountTypeId: ctx.input.accountTypeId,
          description: ctx.input.description
        });
      } else if (paymentType === 'paid') {
        createdPayment = await client.createPaidPayment(jobId, {
          amount: ctx.input.amount,
          date: ctx.input.date,
          paymentMethod: ctx.input.paymentMethod,
          referenceNumber: ctx.input.referenceNumber,
          accountTypeId: ctx.input.accountTypeId,
          description: ctx.input.description
        });
      } else if (paymentType === 'additional_expense') {
        createdPayment = await client.createAdditionalExpense(jobId, {
          amount: ctx.input.amount,
          date: ctx.input.date,
          description: ctx.input.description,
          accountTypeId: ctx.input.accountTypeId
        });
      }

      return {
        output: { createdPayment },
        message: `Recorded **${paymentType}** payment of **$${ctx.input.amount}** for job **${jobId}**.`
      };
    }

    let paymentsResult = await client.getJobPayments(jobId);
    let payments = Array.isArray(paymentsResult)
      ? paymentsResult
      : (paymentsResult?.items ?? paymentsResult?.data ?? []);

    let overview: any;
    try {
      overview = await client.getJobPaymentsOverview(jobId);
    } catch (_e) {
      /* optional */
    }

    return {
      output: { payments, overview },
      message: `Retrieved **${payments.length}** payment(s) for job **${jobId}**.`
    };
  })
  .build();
