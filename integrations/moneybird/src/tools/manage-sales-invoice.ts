import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { administrationIdSchema } from '../lib/schemas';
import {
  checkedOutput,
  exactId,
  fail,
  nullableId,
  validateToolInput
} from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  nextPage: z.number().int().positive().optional(),
  previousPage: z.number().int().positive().optional(),
  salesInvoiceId: z.string(),
  invoiceNumber: z.string().nullable(),
  state: z.string().nullable(),
  actionPerformed: z.string(),
  paused: z.boolean().optional(),
  paymentId: z.string().optional().describe('ID of the accepted payment for registerPayment.'),
  creditInvoiceId: z
    .string()
    .nullable()
    .describe('ID of the created credit invoice (for createCredit action)')
});

export let manageSalesInvoice = SlateTool.create(spec, {
  name: 'Manage Sales Invoice',
  key: 'manage_sales_invoice',
  description: `Perform actions on an existing sales invoice: update details, send via email, register a payment, create a credit invoice, pause/resume the workflow, or delete. Only one action can be performed per invocation. Call list_administrations to choose administrationId when no default is saved.`,
  instructions: [
    'Set exactly one action: "update", "send", "registerPayment", "createCredit", "pause", "resume", or "delete".',
    'For "update", provide updateFields. For "registerPayment", provide paymentAmount and paymentDate.',
    'For "send", optionally provide sendMethod and emailAddress.'
  ]
})
  .input(
    z.object({
      administrationId: administrationIdSchema,
      salesInvoiceId: z.string().describe('Sales invoice ID'),
      action: z
        .enum([
          'update',
          'send',
          'registerPayment',
          'createCredit',
          'pause',
          'resume',
          'delete'
        ])
        .describe('Action to perform'),
      updateFields: z
        .object({
          reference: z.string().optional(),
          dueDate: z.string().optional(),
          discount: z.string().optional()
        })
        .optional()
        .describe('Fields to update (for "update" action)'),
      sendMethod: z
        .enum(['Email', 'Post', 'Manual', 'Simplerinvoicing', 'Peppol'])
        .optional()
        .describe('Delivery method (for "send" action)'),
      emailAddress: z
        .string()
        .optional()
        .describe('Override email address (for "send" action)'),
      paymentAmount: z
        .string()
        .optional()
        .describe('Payment amount (for "registerPayment" action)'),
      paymentDate: z
        .string()
        .optional()
        .describe('Payment date YYYY-MM-DD (for "registerPayment" action)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    validateToolInput('manage_sales_invoice', ctx.input);
    return checkedOutput(outputSchema, async () => {
      let client = new MoneybirdClient({
        token: ctx.auth.token,
        administrationId: ctx.input.administrationId ?? ctx.config.administrationId
      });

      let { salesInvoiceId, action } = ctx.input;
      let resultState: string | null = null;
      let invoiceNumber: string | null = null;
      let creditInvoiceId: string | null = null;
      let paymentId: string | undefined;
      let paused: boolean | undefined;

      switch (action) {
        case 'update': {
          let updateData: Record<string, any> = {};
          if (ctx.input.updateFields?.reference !== undefined)
            updateData.reference = ctx.input.updateFields.reference;
          if (ctx.input.updateFields?.dueDate)
            updateData.due_date = ctx.input.updateFields.dueDate;
          if (ctx.input.updateFields?.discount !== undefined)
            updateData.discount = ctx.input.updateFields.discount;
          let inv = await client.updateSalesInvoice(salesInvoiceId, updateData);
          resultState = inv.state;
          invoiceNumber = inv.invoice_id ?? null;
          break;
        }
        case 'send': {
          let sendOpts: Record<string, any> = {};
          if (ctx.input.sendMethod) sendOpts.delivery_method = ctx.input.sendMethod;
          if (ctx.input.emailAddress) sendOpts.email_address = ctx.input.emailAddress;
          let inv = await client.sendSalesInvoice(salesInvoiceId, sendOpts);
          resultState = inv.state;
          invoiceNumber = inv.invoice_id ?? null;
          break;
        }
        case 'registerPayment': {
          let paymentData: Record<string, any> = {};
          if (ctx.input.paymentAmount) paymentData.price = ctx.input.paymentAmount;
          if (ctx.input.paymentDate) paymentData.payment_date = ctx.input.paymentDate;
          const payment = await client.registerPayment(salesInvoiceId, paymentData);
          paymentId = exactId(payment.id);
          const inv = await client.getSalesInvoice(salesInvoiceId);
          if (
            !Array.isArray(inv.payments) ||
            !inv.payments.some((item: { id?: unknown }) => nullableId(item.id) === paymentId)
          )
            throw fail(
              'Payment was accepted but its invoice relationship could not be confirmed. Reconcile it before retrying.'
            );
          resultState = inv.state;
          invoiceNumber = inv.invoice_id ?? null;
          break;
        }
        case 'createCredit': {
          let creditInv = await client.createCreditInvoice(salesInvoiceId);
          creditInvoiceId = exactId(creditInv.id);
          if (nullableId(creditInv.original_sales_invoice_id) !== salesInvoiceId)
            throw fail(
              'Credit creation returned an inconsistent source-invoice relationship. Reconcile before retrying.'
            );
          resultState = creditInv.state;
          invoiceNumber = creditInv.invoice_id ?? null;
          break;
        }
        case 'pause': {
          let inv = await client.pauseSalesInvoice(salesInvoiceId);
          if (inv.paused !== true)
            throw fail(
              'Invoice pause could not be confirmed. Read the invoice before retrying.'
            );
          paused = inv.paused;
          resultState = inv.state;
          invoiceNumber = inv.invoice_id ?? null;
          break;
        }
        case 'resume': {
          let inv = await client.resumeSalesInvoice(salesInvoiceId);
          if (inv.paused !== false)
            throw fail(
              'Invoice resume could not be confirmed. Read the invoice before retrying.'
            );
          paused = inv.paused;
          resultState = inv.state;
          invoiceNumber = inv.invoice_id ?? null;
          break;
        }
        case 'delete': {
          await client.deleteSalesInvoice(salesInvoiceId);
          resultState = 'deleted';
          break;
        }
      }

      return {
        output: {
          salesInvoiceId,
          invoiceNumber,
          state: resultState,
          actionPerformed: action,
          creditInvoiceId,
          paymentId,
          paused
        },
        message: `Performed **${action}** on invoice ${invoiceNumber || salesInvoiceId}${resultState ? ` (state: ${resultState})` : ''}.`
      };
    });
  })
  .build();
