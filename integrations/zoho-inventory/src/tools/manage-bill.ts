import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let lineItemSchema = z.object({
  itemId: z.string().describe('Item ID'),
  name: z.string().optional().describe('Item name override'),
  quantity: z.number().describe('Quantity'),
  rate: z.number().optional().describe('Rate per unit'),
  taxId: z.string().optional().describe('Tax ID'),
  description: z.string().optional().describe('Description')
});

export let manageBill = SlateTool.create(spec, {
  name: 'Manage Bill',
  key: 'manage_bill',
  description: `Create, update, or change the status of a vendor bill. Supports line items, due dates, and status transitions.
Use without a **billId** to create, or with one to update. Use **action** to mark as open or void.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      billId: z.string().optional().describe('ID of the bill to update. Omit to create.'),
      vendorId: z.string().optional().describe('Vendor contact ID (required for creation)'),
      billNumber: z.string().optional().describe('Bill number'),
      date: z.string().optional().describe('Bill date (YYYY-MM-DD)'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      referenceNumber: z.string().optional().describe('Reference number'),
      lineItems: z.array(lineItemSchema).optional().describe('Bill line items'),
      notes: z.string().optional().describe('Notes'),
      terms: z.string().optional().describe('Terms and conditions'),
      purchaseorderId: z.string().optional().describe('Link to a purchase order'),
      action: z.enum(['open', 'void']).optional().describe('Status action on existing bill')
    })
  )
  .output(
    z.object({
      billId: z.string().describe('Bill ID'),
      billNumber: z.string().optional().describe('Bill number'),
      vendorName: z.string().optional().describe('Vendor name'),
      status: z.string().optional().describe('Bill status'),
      total: z.number().optional().describe('Total amount'),
      balanceDue: z.number().optional().describe('Balance due'),
      date: z.string().optional().describe('Bill date'),
      dueDate: z.string().optional().describe('Due date')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.billId && ctx.input.action) {
      if (ctx.input.action === 'open') {
        await client.markBillOpen(ctx.input.billId);
      } else if (ctx.input.action === 'void') {
        await client.voidBill(ctx.input.billId);
      }
      let result = await client.getBill(ctx.input.billId);
      let bill = result.bill;
      return {
        output: {
          billId: String(bill.bill_id),
          billNumber: bill.bill_number ?? undefined,
          vendorName: bill.vendor_name ?? undefined,
          status: bill.status ?? undefined,
          total: bill.total ?? undefined,
          balanceDue: bill.balance ?? undefined,
          date: bill.date ?? undefined,
          dueDate: bill.due_date ?? undefined
        },
        message: `Bill **${bill.bill_number}** marked as ${ctx.input.action}.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.vendorId !== undefined) body.vendor_id = ctx.input.vendorId;
    if (ctx.input.billNumber !== undefined) body.bill_number = ctx.input.billNumber;
    if (ctx.input.date !== undefined) body.date = ctx.input.date;
    if (ctx.input.dueDate !== undefined) body.due_date = ctx.input.dueDate;
    if (ctx.input.referenceNumber !== undefined)
      body.reference_number = ctx.input.referenceNumber;
    if (ctx.input.notes !== undefined) body.notes = ctx.input.notes;
    if (ctx.input.terms !== undefined) body.terms = ctx.input.terms;
    if (ctx.input.purchaseorderId !== undefined)
      body.purchaseorder_id = ctx.input.purchaseorderId;

    if (ctx.input.lineItems) {
      body.line_items = ctx.input.lineItems.map(li => {
        let item: Record<string, any> = { item_id: li.itemId, quantity: li.quantity };
        if (li.name !== undefined) item.name = li.name;
        if (li.rate !== undefined) item.rate = li.rate;
        if (li.taxId !== undefined) item.tax_id = li.taxId;
        if (li.description !== undefined) item.description = li.description;
        return item;
      });
    }

    let result: any;
    let action: string;

    if (ctx.input.billId) {
      result = await client.updateBill(ctx.input.billId, body);
      action = 'updated';
    } else {
      result = await client.createBill(body);
      action = 'created';
    }

    let bill = result.bill;

    return {
      output: {
        billId: String(bill.bill_id),
        billNumber: bill.bill_number ?? undefined,
        vendorName: bill.vendor_name ?? undefined,
        status: bill.status ?? undefined,
        total: bill.total ?? undefined,
        balanceDue: bill.balance ?? undefined,
        date: bill.date ?? undefined,
        dueDate: bill.due_date ?? undefined
      },
      message: `Bill **${bill.bill_number}** (${bill.bill_id}) ${action} successfully. Total: ${bill.total}.`
    };
  })
  .build();
