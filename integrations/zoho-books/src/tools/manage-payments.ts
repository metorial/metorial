import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let recordCustomerPaymentTool = SlateTool.create(spec, {
  name: 'Record Customer Payment',
  key: 'record_customer_payment',
  description: `Record a payment received from a customer. Can be applied to specific invoices or recorded as an advance/excess payment.`,
  instructions: [
    'Provide customerId, amount, and paymentMode.',
    'Use invoices array to apply the payment to specific invoices with amounts.'
  ]
})
  .input(
    z.object({
      customerId: z.string().describe('ID of the customer'),
      amount: z.number().describe('Total payment amount'),
      date: z.string().optional().describe('Payment date (YYYY-MM-DD)'),
      paymentMode: z
        .string()
        .optional()
        .describe('e.g. cash, check, bank_transfer, credit_card'),
      referenceNumber: z.string().optional(),
      description: z.string().optional(),
      accountId: z.string().optional().describe('Deposit-to bank account ID'),
      invoices: z
        .array(
          z.object({
            invoiceId: z.string(),
            amountApplied: z.number()
          })
        )
        .optional()
        .describe('Invoices to apply this payment to')
    })
  )
  .output(
    z.object({
      paymentId: z.string(),
      paymentNumber: z.string().optional(),
      customerId: z.string().optional(),
      amount: z.number().optional(),
      date: z.string().optional(),
      currencyCode: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let input = ctx.input;

    let payload: Record<string, any> = {
      customer_id: input.customerId,
      amount: input.amount
    };

    if (input.date) payload.date = input.date;
    if (input.paymentMode) payload.payment_mode = input.paymentMode;
    if (input.referenceNumber) payload.reference_number = input.referenceNumber;
    if (input.description) payload.description = input.description;
    if (input.accountId) payload.account_id = input.accountId;
    if (input.invoices) {
      payload.invoices = input.invoices.map(inv => ({
        invoice_id: inv.invoiceId,
        amount_applied: inv.amountApplied
      }));
    }

    let resp = await client.createCustomerPayment(payload);
    let pmt = resp.payment;

    return {
      output: {
        paymentId: pmt.payment_id,
        paymentNumber: pmt.payment_number,
        customerId: pmt.customer_id,
        amount: pmt.amount,
        date: pmt.date,
        currencyCode: pmt.currency_code
      },
      message: `Recorded customer payment **${pmt.payment_number}** of ${pmt.currency_code} ${pmt.amount}.`
    };
  })
  .build();

export let recordVendorPaymentTool = SlateTool.create(spec, {
  name: 'Record Vendor Payment',
  key: 'record_vendor_payment',
  description: `Record a payment made to a vendor. Can be applied to specific bills or recorded as an advance payment.`,
  instructions: [
    'Provide vendorId, amount, and paidThroughAccountId.',
    'Use bills array to apply the payment to specific bills with amounts.'
  ]
})
  .input(
    z.object({
      vendorId: z.string().describe('ID of the vendor'),
      amount: z.number().describe('Total payment amount'),
      date: z.string().optional().describe('Payment date (YYYY-MM-DD)'),
      paymentMode: z.string().optional(),
      referenceNumber: z.string().optional(),
      description: z.string().optional(),
      paidThroughAccountId: z
        .string()
        .optional()
        .describe('Account from which payment is made'),
      bills: z
        .array(
          z.object({
            billId: z.string(),
            amountApplied: z.number()
          })
        )
        .optional()
        .describe('Bills to apply this payment to')
    })
  )
  .output(
    z.object({
      paymentId: z.string(),
      paymentNumber: z.string().optional(),
      vendorId: z.string().optional(),
      amount: z.number().optional(),
      date: z.string().optional(),
      currencyCode: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let input = ctx.input;

    let payload: Record<string, any> = {
      vendor_id: input.vendorId,
      amount: input.amount
    };

    if (input.date) payload.date = input.date;
    if (input.paymentMode) payload.payment_mode = input.paymentMode;
    if (input.referenceNumber) payload.reference_number = input.referenceNumber;
    if (input.description) payload.description = input.description;
    if (input.paidThroughAccountId)
      payload.paid_through_account_id = input.paidThroughAccountId;
    if (input.bills) {
      payload.bills = input.bills.map(b => ({
        bill_id: b.billId,
        amount_applied: b.amountApplied
      }));
    }

    let resp = await client.createVendorPayment(payload);
    let pmt = resp.vendorpayment;

    return {
      output: {
        paymentId: pmt.payment_id,
        paymentNumber: pmt.payment_number,
        vendorId: pmt.vendor_id,
        amount: pmt.amount,
        date: pmt.date,
        currencyCode: pmt.currency_code
      },
      message: `Recorded vendor payment **${pmt.payment_number}** of ${pmt.currency_code} ${pmt.amount}.`
    };
  })
  .build();

export let listCustomerPaymentsTool = SlateTool.create(spec, {
  name: 'List Customer Payments',
  key: 'list_customer_payments',
  description: `List payments received from customers with filtering by customer and date range.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      customerId: z.string().optional(),
      dateFrom: z.string().optional().describe('Filter from date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('Filter to date (YYYY-MM-DD)'),
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(200)
    })
  )
  .output(
    z.object({
      payments: z.array(
        z.object({
          paymentId: z.string(),
          paymentNumber: z.string().optional(),
          customerId: z.string().optional(),
          customerName: z.string().optional(),
          amount: z.number().optional(),
          date: z.string().optional(),
          paymentMode: z.string().optional(),
          currencyCode: z.string().optional()
        })
      ),
      pageContext: z
        .object({
          page: z.number(),
          perPage: z.number(),
          hasMorePage: z.boolean()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let query: Record<string, any> = { page: ctx.input.page, per_page: ctx.input.perPage };
    if (ctx.input.customerId) query.customer_id = ctx.input.customerId;
    if (ctx.input.dateFrom) query.date_start = ctx.input.dateFrom;
    if (ctx.input.dateTo) query.date_end = ctx.input.dateTo;

    let resp = await client.listCustomerPayments(query);
    let payments = (resp.customerpayments || resp.payments || []).map((p: any) => ({
      paymentId: p.payment_id,
      paymentNumber: p.payment_number,
      customerId: p.customer_id,
      customerName: p.customer_name,
      amount: p.amount,
      date: p.date,
      paymentMode: p.payment_mode,
      currencyCode: p.currency_code
    }));

    let pageContext = resp.page_context
      ? {
          page: resp.page_context.page,
          perPage: resp.page_context.per_page,
          hasMorePage: resp.page_context.has_more_page
        }
      : undefined;

    return {
      output: { payments, pageContext },
      message: `Found **${payments.length}** customer payment(s).`
    };
  })
  .build();
