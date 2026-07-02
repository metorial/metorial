import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

let invoicePositionSchema = z
  .object({
    name: z.string().describe('Name/description of the line item'),
    quantity: z.number().describe('Quantity'),
    price: z.number().describe('Unit price (net)'),
    taxRate: z.number().describe('Tax rate as percentage (e.g. 19 for 19%)'),
    unity: z.string().optional().describe('Unity ID for the unit of measure'),
    partId: z.string().optional().describe('Part/product ID if linked to inventory'),
    discount: z.number().optional().describe('Discount percentage'),
    text: z.string().optional().describe('Additional text for the position'),
    positionNumber: z.number().optional().describe('Custom position number')
  })
  .describe('Invoice line item/position');

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create a new invoice in sevDesk with line items. The invoice is created using the Factory endpoint which handles proper tax rule application and position creation.`,
  instructions: [
    'Use the Receipt Guidance tool first to determine valid tax rule, tax rate, and booking account combinations.',
    'Contact ID is required — search for or create the contact first.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact (customer) for this invoice'),
      invoiceDate: z.string().describe('Invoice date in YYYY-MM-DD format'),
      dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
      header: z.string().optional().describe('Invoice header text'),
      headText: z.string().optional().describe('Text above the line items'),
      footText: z.string().optional().describe('Text below the line items'),
      invoiceNumber: z
        .string()
        .optional()
        .describe('Custom invoice number (auto-generated if omitted)'),
      discount: z.number().optional().describe('Discount percentage on the total'),
      discountTime: z
        .number()
        .optional()
        .describe('Number of days for early payment discount'),
      deliveryDate: z.string().optional().describe('Delivery date in YYYY-MM-DD format'),
      deliveryDateUntil: z
        .string()
        .optional()
        .describe('Delivery period end date in YYYY-MM-DD format'),
      timeToPay: z.number().optional().describe('Payment term in days'),
      taxRuleId: z
        .string()
        .optional()
        .describe('Tax rule ID (for sevDesk 2.0). Use Receipt Guidance to find valid IDs.'),
      currency: z.string().optional().describe('Currency code (default: EUR)'),
      positions: z.array(invoicePositionSchema).describe('Line items for the invoice'),
      sendType: z
        .enum(['VPR', 'VPDF', 'VM', 'VP'])
        .optional()
        .describe('Send type: VPR=print, VPDF=PDF, VM=mail, VP=post'),
      status: z.number().optional().describe('Initial status: 100=Draft, 200=Open')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('ID of the created invoice'),
      invoiceNumber: z.string().optional().describe('Invoice number'),
      totalNet: z.string().optional().describe('Net total amount'),
      totalGross: z.string().optional().describe('Gross total amount'),
      status: z.string().optional().describe('Invoice status code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });

    let invoiceData: Record<string, any> = {
      objectName: 'Invoice',
      contact: { id: ctx.input.contactId, objectName: 'Contact' },
      invoiceDate: ctx.input.invoiceDate,
      status: ctx.input.status ?? 100,
      invoiceType: 'RE',
      currency: ctx.input.currency ?? 'EUR',
      mapAll: true
    };

    if (ctx.input.dueDate) invoiceData.dueDate = ctx.input.dueDate;
    if (ctx.input.header) invoiceData.header = ctx.input.header;
    if (ctx.input.headText) invoiceData.headText = ctx.input.headText;
    if (ctx.input.footText) invoiceData.footText = ctx.input.footText;
    if (ctx.input.invoiceNumber) invoiceData.invoiceNumber = ctx.input.invoiceNumber;
    if (ctx.input.discount !== undefined) invoiceData.discount = ctx.input.discount;
    if (ctx.input.discountTime !== undefined)
      invoiceData.discountTime = ctx.input.discountTime;
    if (ctx.input.deliveryDate) invoiceData.deliveryDate = ctx.input.deliveryDate;
    if (ctx.input.deliveryDateUntil)
      invoiceData.deliveryDateUntil = ctx.input.deliveryDateUntil;
    if (ctx.input.timeToPay !== undefined) invoiceData.timeToPay = ctx.input.timeToPay;
    if (ctx.input.taxRuleId) {
      invoiceData.taxRule = { id: ctx.input.taxRuleId, objectName: 'TaxRule' };
    }
    if (ctx.input.sendType) invoiceData.sendType = ctx.input.sendType;

    let positions = ctx.input.positions.map((pos, idx) => {
      let posData: Record<string, any> = {
        objectName: 'InvoicePos',
        mapAll: true,
        name: pos.name,
        quantity: pos.quantity,
        price: pos.price,
        taxRate: pos.taxRate,
        positionNumber: pos.positionNumber ?? idx
      };
      if (pos.unity) posData.unity = { id: pos.unity, objectName: 'Unity' };
      if (pos.partId) posData.part = { id: pos.partId, objectName: 'Part' };
      if (pos.discount !== undefined) posData.discount = pos.discount;
      if (pos.text) posData.text = pos.text;
      return posData;
    });

    let result = await client.createInvoice({
      invoice: invoiceData,
      invoicePosSave: positions
    });

    let invoice = result?.invoice ?? result;

    return {
      output: {
        invoiceId: String(invoice.id),
        invoiceNumber: invoice.invoiceNumber ?? undefined,
        totalNet: invoice.sumNet ?? undefined,
        totalGross: invoice.sumGross ?? undefined,
        status: invoice.status ? String(invoice.status) : undefined
      },
      message: `Created invoice **${invoice.invoiceNumber ?? invoice.id}** for contact ${ctx.input.contactId}.`
    };
  })
  .build();
