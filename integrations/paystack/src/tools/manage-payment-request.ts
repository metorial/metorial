import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';

import {
  exactId,
  optionalNumericId,
  optionalRecord,
  pagination,
  record,
  records,
  validateOutput
} from '../lib/transport';
import { spec } from '../spec';

const createPaymentRequestOutput = z.object({
  requestCode: z.string().describe('Payment request code'),
  requestId: z.number().optional().describe('Payment request ID'),
  exactRequestId: z
    .string()
    .describe(
      'Exact provider resource ID; legacy numeric ID is omitted outside its safe range'
    ),
  status: z.string().describe('Payment request status'),
  amount: z.number().describe('Total amount'),
  currency: z.string().describe('Currency')
});

export let createPaymentRequest = SlateTool.create(spec, {
  name: 'Create Payment Request',
  key: 'create_payment_request',
  description: `Create and send an invoice/payment request to a customer. Supports line items, tax, due dates, and notifications.
Amounts are in the **smallest currency unit**.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customer: z.string().describe('Customer code or customer ID'),
      amount: z
        .number()
        .describe(
          'Amount in currency subunits; retained required input, sent only when lineItems and tax are absent'
        ),
      dueDate: z.string().optional().describe('Due date (ISO 8601 format)'),
      description: z.string().optional().describe('Payment request description'),
      currency: z.string().optional().describe('Currency code (default NGN)'),
      lineItems: z
        .array(
          z.object({
            name: z.string().describe('Item name'),
            amount: z.number().describe('Item amount'),
            quantity: z.number().describe('Item quantity')
          })
        )
        .optional()
        .describe('Line items for the invoice'),
      tax: z
        .array(
          z.object({
            name: z.string().describe('Tax name'),
            amount: z.number().describe('Tax amount')
          })
        )
        .optional()
        .describe('Tax entries'),
      sendNotification: z
        .boolean()
        .optional()
        .describe('Defaults to true when not a draft; can send an email to the customer'),
      draft: z
        .boolean()
        .optional()
        .describe(
          'Defaults to false; true saves an unsent draft and overrides sendNotification'
        )
    })
  )
  .output(createPaymentRequestOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.createPaymentRequest(ctx.input);
    const request = record(result.data);
    const output = {
      requestCode: request.request_code,
      requestId: optionalNumericId(request.id),
      exactRequestId: exactId(request.id),
      status: request.status,
      amount: request.amount,
      currency: request.currency
    };
    return {
      output: validateOutput(createPaymentRequestOutput, output),
      message:
        'Payment request accepted. Notification and draft behavior follows the supplied options; archiving retains history.'
    };
  })
  .build();
const listPaymentRequestsOutput = z.object({
  requests: z.array(
    z.object({
      requestCode: z.string().describe('Payment request code'),
      requestId: z.number().optional().describe('Payment request ID'),
      exactRequestId: z
        .string()
        .describe(
          'Exact provider resource ID; legacy numeric ID is omitted outside its safe range'
        ),
      status: z.string().describe('Status'),
      amount: z.number().describe('Amount'),
      currency: z.string().describe('Currency'),
      description: z.string().nullable().describe('Description'),
      customerEmail: z.string().describe('Customer email'),
      dueDate: z.string().nullable().describe('Due date')
    })
  ),
  totalCount: z.number().optional().describe('Total requests'),
  currentPage: z.number().optional().describe('Current page'),
  totalPages: z.number().optional().describe('Total pages'),
  nextCursor: z.string().nullable().optional().describe('Provider next cursor, when returned'),
  previousCursor: z
    .string()
    .nullable()
    .optional()
    .describe('Provider previous cursor, when returned'),
  perPage: z.number().optional().describe('Observed provider page size')
});

export let listPaymentRequests = SlateTool.create(spec, {
  name: 'List Payment Requests',
  key: 'list_payment_requests',
  description: `Retrieve a paginated list of payment requests/invoices. Filter by customer, status, currency, or date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      perPage: z.number().optional().describe('Records per page'),
      page: z.number().optional().describe('Page number'),
      customer: z
        .string()
        .optional()
        .describe('Filter by exact customer ID; customer codes are resolved before listing'),
      status: z
        .string()
        .optional()
        .describe('Filter by status (draft, success, pending, failed)'),
      currency: z.string().optional().describe('Filter by currency'),
      from: z.string().optional().describe('Start date (ISO 8601)'),
      to: z.string().optional().describe('End date (ISO 8601)')
    })
  )
  .output(listPaymentRequestsOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.listPaymentRequests(ctx.input);
    const output = {
      requests: records(result.data).map(item => ({
        requestCode: item.request_code,
        requestId: optionalNumericId(item.id),
        exactRequestId: exactId(item.id),
        status: item.status,
        amount: item.amount,
        currency: item.currency,
        description: item.description ?? null,
        customerEmail: optionalRecord(item.customer).email,
        dueDate: item.due_date ?? null
      })),
      ...pagination(result.meta)
    };
    return {
      output: validateOutput(listPaymentRequestsOutput, output),
      message:
        'Retrieved the requested page; continuation and counts are included only when returned by Paystack.'
    };
  })
  .build();
