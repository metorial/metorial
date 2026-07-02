import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';
import { spec } from '../spec';

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
      amount: z.number().describe('Total amount in smallest currency unit'),
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
      sendNotification: z.boolean().optional().describe('Whether to email the customer'),
      draft: z.boolean().optional().describe('Create as draft (not sent to customer)')
    })
  )
  .output(
    z.object({
      requestCode: z.string().describe('Payment request code'),
      requestId: z.number().describe('Payment request ID'),
      status: z.string().describe('Payment request status'),
      amount: z.number().describe('Total amount'),
      currency: z.string().describe('Currency')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.createPaymentRequest({
      customer: ctx.input.customer,
      amount: ctx.input.amount,
      dueDate: ctx.input.dueDate,
      description: ctx.input.description,
      currency: ctx.input.currency,
      lineItems: ctx.input.lineItems,
      tax: ctx.input.tax,
      sendNotification: ctx.input.sendNotification,
      draft: ctx.input.draft
    });

    let pr = result.data;

    return {
      output: {
        requestCode: pr.request_code,
        requestId: pr.id,
        status: pr.status,
        amount: pr.amount,
        currency: pr.currency
      },
      message: `Payment request **${pr.request_code}** created. Amount: ${pr.amount} ${pr.currency}. Status: **${pr.status}**.`
    };
  })
  .build();

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
      customer: z.string().optional().describe('Filter by customer code'),
      status: z
        .string()
        .optional()
        .describe('Filter by status (draft, success, pending, failed)'),
      currency: z.string().optional().describe('Filter by currency'),
      from: z.string().optional().describe('Start date (ISO 8601)'),
      to: z.string().optional().describe('End date (ISO 8601)')
    })
  )
  .output(
    z.object({
      requests: z.array(
        z.object({
          requestCode: z.string().describe('Payment request code'),
          requestId: z.number().describe('Payment request ID'),
          status: z.string().describe('Status'),
          amount: z.number().describe('Amount'),
          currency: z.string().describe('Currency'),
          description: z.string().nullable().describe('Description'),
          customerEmail: z.string().describe('Customer email'),
          dueDate: z.string().nullable().describe('Due date')
        })
      ),
      totalCount: z.number().describe('Total requests'),
      currentPage: z.number().describe('Current page'),
      totalPages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.listPaymentRequests({
      perPage: ctx.input.perPage,
      page: ctx.input.page,
      customer: ctx.input.customer,
      status: ctx.input.status,
      currency: ctx.input.currency,
      from: ctx.input.from,
      to: ctx.input.to
    });

    let requests = (result.data ?? []).map((r: any) => ({
      requestCode: r.request_code,
      requestId: r.id,
      status: r.status,
      amount: r.amount,
      currency: r.currency,
      description: r.description ?? null,
      customerEmail: r.customer?.email ?? '',
      dueDate: r.due_date ?? null
    }));

    let meta = result.meta ?? {};

    return {
      output: {
        requests,
        totalCount: meta.total ?? 0,
        currentPage: meta.page ?? 1,
        totalPages: meta.pageCount ?? 1
      },
      message: `Found **${meta.total ?? requests.length}** payment requests.`
    };
  })
  .build();
