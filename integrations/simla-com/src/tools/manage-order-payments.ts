import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageOrderPayments = SlateTool.create(spec, {
  name: 'Manage Order Payments',
  key: 'manage_order_payments',
  description: `Create, edit, or delete payment records on orders. Each payment has a type, status, and amount. Use the **action** field to specify the operation.`,
  instructions: [
    'Payment types and statuses must match codes configured in Simla.com reference data.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'edit', 'delete']).describe('Operation to perform'),
      paymentId: z.number().optional().describe('Payment ID (for edit/delete actions)'),
      orderId: z.number().optional().describe('Order internal ID (for create action)'),
      orderExternalId: z.string().optional().describe('Order external ID (for create action)'),
      type: z.string().optional().describe('Payment type code (for create/edit)'),
      status: z.string().optional().describe('Payment status code (for create/edit)'),
      amount: z.number().optional().describe('Payment amount (for create/edit)'),
      paidAt: z.string().optional().describe('Payment date (YYYY-MM-DD HH:MM:SS)'),
      externalId: z.string().optional().describe('External payment ID (for create/edit)'),
      comment: z.string().optional().describe('Payment comment (for create/edit)')
    })
  )
  .output(
    z.object({
      paymentId: z.number().optional().describe('Created or edited payment ID'),
      deleted: z.boolean().optional().describe('Whether the payment was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      site: ctx.config.site
    });

    if (ctx.input.action === 'create') {
      let payment: Record<string, any> = {};
      if (ctx.input.orderId) payment.order = { id: ctx.input.orderId };
      if (ctx.input.orderExternalId) payment.order = { externalId: ctx.input.orderExternalId };
      if (ctx.input.type) payment.type = ctx.input.type;
      if (ctx.input.status) payment.status = ctx.input.status;
      if (ctx.input.amount !== undefined) payment.amount = ctx.input.amount;
      if (ctx.input.paidAt) payment.paidAt = ctx.input.paidAt;
      if (ctx.input.externalId) payment.externalId = ctx.input.externalId;
      if (ctx.input.comment) payment.comment = ctx.input.comment;

      let result = await client.createOrderPayment(payment);
      return {
        output: { paymentId: result.paymentId },
        message: `Created payment **${result.paymentId}**.`
      };
    }

    if (ctx.input.action === 'edit') {
      if (!ctx.input.paymentId) throw new Error('paymentId is required for edit action.');
      let payment: Record<string, any> = {};
      if (ctx.input.type) payment.type = ctx.input.type;
      if (ctx.input.status) payment.status = ctx.input.status;
      if (ctx.input.amount !== undefined) payment.amount = ctx.input.amount;
      if (ctx.input.paidAt) payment.paidAt = ctx.input.paidAt;
      if (ctx.input.externalId) payment.externalId = ctx.input.externalId;
      if (ctx.input.comment) payment.comment = ctx.input.comment;

      let result = await client.editOrderPayment(ctx.input.paymentId, payment);
      return {
        output: { paymentId: result.paymentId },
        message: `Updated payment **${result.paymentId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.paymentId) throw new Error('paymentId is required for delete action.');
      await client.deleteOrderPayment(ctx.input.paymentId);
      return {
        output: { deleted: true },
        message: `Deleted payment **${ctx.input.paymentId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
