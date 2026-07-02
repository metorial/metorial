import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

export let manageSalesInvoice = SlateTool.create(spec, {
  name: 'Manage Sales Invoice',
  key: 'manage_sales_invoice',
  description: `Perform actions on an existing sales invoice: update details, send via email, register a payment, create a credit invoice, pause/resume the workflow, or delete. Only one action can be performed per invocation.`,
  instructions: [
    'Set exactly one action: "update", "send", "registerPayment", "createCredit", "pause", "resume", or "delete".',
    'For "update", provide updateFields. For "registerPayment", provide paymentAmount and paymentDate.',
    'For "send", optionally provide sendMethod and emailAddress.'
  ]
})
  .input(
    z.object({
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
  .output(
    z.object({
      salesInvoiceId: z.string(),
      invoiceNumber: z.string().nullable(),
      state: z.string().nullable(),
      actionPerformed: z.string(),
      creditInvoiceId: z
        .string()
        .nullable()
        .describe('ID of the created credit invoice (for createCredit action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoneybirdClient({
      token: ctx.auth.token,
      administrationId: ctx.config.administrationId
    });

    let { salesInvoiceId, action } = ctx.input;
    let resultState: string | null = null;
    let invoiceNumber: string | null = null;
    let creditInvoiceId: string | null = null;

    switch (action) {
      case 'update': {
        let updateData: Record<string, any> = {};
        if (ctx.input.updateFields?.reference !== undefined)
          updateData.reference = ctx.input.updateFields.reference;
        if (ctx.input.updateFields?.dueDate)
          updateData.due_date = ctx.input.updateFields.dueDate;
        if (ctx.input.updateFields?.discount)
          updateData.discount = ctx.input.updateFields.discount;
        let inv = await client.updateSalesInvoice(salesInvoiceId, updateData);
        resultState = inv.state;
        invoiceNumber = inv.invoice_id || null;
        break;
      }
      case 'send': {
        let sendOpts: Record<string, any> = {};
        if (ctx.input.sendMethod) sendOpts.delivery_method = ctx.input.sendMethod;
        if (ctx.input.emailAddress) sendOpts.email_address = ctx.input.emailAddress;
        let inv = await client.sendSalesInvoice(salesInvoiceId, sendOpts);
        resultState = inv.state;
        invoiceNumber = inv.invoice_id || null;
        break;
      }
      case 'registerPayment': {
        let paymentData: Record<string, any> = {};
        if (ctx.input.paymentAmount) paymentData.price = ctx.input.paymentAmount;
        if (ctx.input.paymentDate) paymentData.payment_date = ctx.input.paymentDate;
        let inv = await client.registerPayment(salesInvoiceId, paymentData);
        resultState = inv.state;
        invoiceNumber = inv.invoice_id || null;
        break;
      }
      case 'createCredit': {
        let creditInv = await client.createCreditInvoice(salesInvoiceId);
        creditInvoiceId = String(creditInv.id);
        resultState = creditInv.state;
        invoiceNumber = creditInv.invoice_id || null;
        break;
      }
      case 'pause': {
        let inv = await client.pauseSalesInvoice(salesInvoiceId);
        resultState = inv.state;
        invoiceNumber = inv.invoice_id || null;
        break;
      }
      case 'resume': {
        let inv = await client.resumeSalesInvoice(salesInvoiceId);
        resultState = inv.state;
        invoiceNumber = inv.invoice_id || null;
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
        creditInvoiceId
      },
      message: `Performed **${action}** on invoice ${invoiceNumber || salesInvoiceId}${resultState ? ` (state: ${resultState})` : ''}.`
    };
  });
