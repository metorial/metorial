import { SlateTool } from 'slates';
import { z } from 'zod';
import { BTCPayClient } from '../lib/client';
import { spec } from '../spec';

let paymentRequestSchema = z.object({
  paymentRequestId: z.string().describe('Payment request ID'),
  title: z.string().describe('Payment request title'),
  amount: z.number().describe('Requested amount'),
  currency: z.string().optional().nullable().describe('Currency code'),
  description: z.string().optional().nullable().describe('Payment request description'),
  status: z.string().optional().describe('Payment request status'),
  email: z.string().optional().nullable().describe('Requester email'),
  expiryDate: z.string().optional().nullable().describe('Expiry date'),
  createdTime: z.string().optional().describe('Creation timestamp')
});

export let managePaymentRequests = SlateTool.create(spec, {
  name: 'Manage Payment Requests',
  key: 'manage_payment_requests',
  description: `Create, list, update, or archive shareable payment requests. Payment requests are pages where customers can pay on their own schedule with automatic exchange rate updates. Useful for freelancers, invoicing, or requesting money.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'archive'])
        .describe('Action to perform'),
      storeId: z.string().describe('Store ID'),
      paymentRequestId: z
        .string()
        .optional()
        .describe('Payment request ID (for get, update, archive)'),
      title: z
        .string()
        .optional()
        .describe('Title (required for create, optional for update)'),
      amount: z
        .number()
        .optional()
        .describe('Amount (required for create, optional for update)'),
      currency: z.string().optional().describe('Currency code'),
      description: z.string().optional().describe('Markdown description'),
      email: z.string().optional().describe('Requester email'),
      expiryDate: z.string().optional().describe('Expiry date (ISO format)'),
      allowCustomPaymentAmounts: z
        .boolean()
        .optional()
        .describe('Allow customers to pay custom amounts')
    })
  )
  .output(
    z.object({
      paymentRequest: paymentRequestSchema.optional().describe('Payment request details'),
      paymentRequests: z
        .array(paymentRequestSchema)
        .optional()
        .describe('List of payment requests'),
      archived: z.boolean().optional().describe('Whether the payment request was archived')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BTCPayClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let { action, storeId } = ctx.input;

    let mapRequest = (pr: Record<string, unknown>) => ({
      paymentRequestId: pr.id as string,
      title: pr.title as string,
      amount: pr.amount as number,
      currency: pr.currency as string | undefined,
      description: pr.description as string | undefined,
      status: pr.status as string | undefined,
      email: pr.email as string | undefined,
      expiryDate: pr.expiryDate !== undefined ? String(pr.expiryDate) : undefined,
      createdTime: pr.createdTime !== undefined ? String(pr.createdTime) : undefined
    });

    if (action === 'list') {
      let requests = await client.getPaymentRequests(storeId);
      let mapped = requests.map(mapRequest);
      return {
        output: { paymentRequests: mapped },
        message: `Found **${mapped.length}** payment request(s).`
      };
    }

    if (action === 'get') {
      let pr = await client.getPaymentRequest(storeId, ctx.input.paymentRequestId!);
      return {
        output: { paymentRequest: mapRequest(pr) },
        message: `Payment request **${pr.title}** — ${pr.amount} ${pr.currency ?? ''}, status: **${pr.status}**.`
      };
    }

    if (action === 'create') {
      let pr = await client.createPaymentRequest(storeId, {
        title: ctx.input.title!,
        amount: ctx.input.amount!,
        currency: ctx.input.currency,
        description: ctx.input.description,
        email: ctx.input.email,
        expiryDate: ctx.input.expiryDate,
        allowCustomPaymentAmounts: ctx.input.allowCustomPaymentAmounts
      });
      return {
        output: { paymentRequest: mapRequest(pr) },
        message: `Created payment request **${pr.title}** for ${pr.amount} ${pr.currency ?? ''}.`
      };
    }

    if (action === 'update') {
      let updateData: Record<string, unknown> = {};
      if (ctx.input.title !== undefined) updateData.title = ctx.input.title;
      if (ctx.input.amount !== undefined) updateData.amount = ctx.input.amount;
      if (ctx.input.currency !== undefined) updateData.currency = ctx.input.currency;
      if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
      if (ctx.input.email !== undefined) updateData.email = ctx.input.email;
      if (ctx.input.expiryDate !== undefined) updateData.expiryDate = ctx.input.expiryDate;
      if (ctx.input.allowCustomPaymentAmounts !== undefined)
        updateData.allowCustomPaymentAmounts = ctx.input.allowCustomPaymentAmounts;
      let pr = await client.updatePaymentRequest(
        storeId,
        ctx.input.paymentRequestId!,
        updateData
      );
      return {
        output: { paymentRequest: mapRequest(pr) },
        message: `Updated payment request **${pr.title}**.`
      };
    }

    // archive
    await client.archivePaymentRequest(storeId, ctx.input.paymentRequestId!);
    return {
      output: { archived: true },
      message: `Archived payment request **${ctx.input.paymentRequestId}**.`
    };
  })
  .build();
