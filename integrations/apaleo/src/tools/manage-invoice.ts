import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ApaleoClient } from '../lib/client';
import { spec } from '../spec';

export let manageInvoice = SlateTool.create(spec, {
  name: 'Manage Invoice',
  key: 'manage_invoice',
  description: `Create, cancel, or mark invoices as paid. To **create** an invoice, provide a folioId. To **cancel** or **mark as paid**, provide the invoiceId. Also supports retrieving a specific invoice by ID.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      action: z.enum(['create', 'cancel', 'mark_paid', 'get']).describe('Action to perform'),
      folioId: z
        .string()
        .optional()
        .describe('Folio ID to create an invoice from (for "create")'),
      invoiceId: z
        .string()
        .optional()
        .describe('Invoice ID (for "cancel", "mark_paid", or "get")'),
      languageCode: z
        .string()
        .optional()
        .describe('Invoice language for create; defaults to the account default language.'),
      reasonCode: z
        .enum([
          'ChangeOfRecipientDetails',
          'ChangeOfInvoiceRecipient',
          'ChangeOfPaymentMethod',
          'ChangeOfInvoiceTransactions',
          'Other'
        ])
        .optional()
        .describe('Cancellation reason; defaults to Other.'),
      paymentMethod: z
        .string()
        .optional()
        .describe('Payment method required for mark_paid, such as Cash or BankTransfer.'),
      receipt: z.string().optional().describe('Payment receipt required for mark_paid.')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().optional().describe('Invoice ID'),
      action: z.string().describe('Action performed'),
      success: z.boolean(),
      invoice: z
        .object({
          invoiceId: z.string().optional(),
          number: z.string().optional(),
          type: z.string().optional(),
          status: z.string().optional(),
          folioId: z.string().optional(),
          reservationId: z.string().optional(),
          propertyId: z.string().optional(),
          recipientName: z.string().optional(),
          totalGrossAmount: z
            .object({
              amount: z.number().optional(),
              currency: z.string().optional()
            })
            .optional(),
          created: z.string().optional()
        })
        .passthrough()
        .optional()
        .describe('Invoice details (for "get" and "create")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApaleoClient(ctx.auth.token);
    let { action } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.folioId)
          throw createApiServiceError('folioId is required to create an invoice');
        let languageCode =
          ctx.input.languageCode ?? (await client.getCurrentAccount()).defaultLanguage;
        let result = await client.createInvoice(ctx.input.folioId, languageCode);
        let invoiceId = result.id;
        return {
          output: { invoiceId, action, success: true },
          message: `Created invoice **${invoiceId}** from folio **${ctx.input.folioId}**.`
        };
      }
      case 'cancel': {
        if (!ctx.input.invoiceId)
          throw createApiServiceError('invoiceId is required to cancel');
        await client.cancelInvoice(ctx.input.invoiceId, ctx.input.reasonCode ?? 'Other');
        return {
          output: { invoiceId: ctx.input.invoiceId, action, success: true },
          message: `Cancelled invoice **${ctx.input.invoiceId}**.`
        };
      }
      case 'mark_paid': {
        if (!ctx.input.invoiceId)
          throw createApiServiceError('invoiceId is required to mark as paid');
        if (!ctx.input.paymentMethod || !ctx.input.receipt) {
          throw createApiServiceError(
            'paymentMethod and receipt are required to mark an invoice as paid.'
          );
        }
        await client.markInvoicePaid(
          ctx.input.invoiceId,
          ctx.input.paymentMethod,
          ctx.input.receipt
        );
        return {
          output: { invoiceId: ctx.input.invoiceId, action, success: true },
          message: `Marked invoice **${ctx.input.invoiceId}** as paid.`
        };
      }
      case 'get': {
        if (!ctx.input.invoiceId)
          throw createApiServiceError('invoiceId is required to get invoice');
        let inv = await client.getInvoice(ctx.input.invoiceId);
        return {
          output: {
            invoiceId: inv.id,
            action,
            success: true,
            invoice: {
              invoiceId: inv.id,
              number: inv.number,
              type: inv.type,
              status: inv.status,
              folioId: inv.folioId,
              reservationId: inv.stayInfo?.reservationId ?? inv.reservation?.id,
              propertyId: inv.propertyId ?? inv.property?.id,
              recipientName: inv.to?.name ?? inv.recipient?.name,
              totalGrossAmount: inv.total ?? inv.totalGrossAmount,
              created: inv.created
            }
          },
          message: `Invoice **${inv.id}** (#${inv.number}), status: **${inv.status}**.`
        };
      }
    }
  })
  .build();
