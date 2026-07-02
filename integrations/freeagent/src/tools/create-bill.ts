import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

let billItemSchema = z.object({
  category: z.string().describe('Category URL for this line item'),
  description: z.string().optional().describe('Line item description'),
  totalValue: z.string().describe('Total value of this line item'),
  salesTaxRate: z.string().optional().describe('Sales tax rate percentage'),
  quantity: z.number().optional().describe('Quantity'),
  unitPrice: z.string().optional().describe('Unit price')
});

export let createBill = SlateTool.create(spec, {
  name: 'Create Bill',
  key: 'create_bill',
  description: `Create a new supplier bill in FreeAgent. Requires a contact, reference, date, due date, and at least one line item.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('Supplier contact ID'),
      reference: z.string().describe('Bill reference number'),
      datedOn: z.string().describe('Bill date in YYYY-MM-DD format'),
      dueOn: z.string().describe('Due date in YYYY-MM-DD format'),
      projectId: z.string().optional().describe('Project ID to associate with'),
      currency: z.string().optional().describe('Currency code'),
      comments: z.string().optional().describe('Comments on the bill'),
      billItems: z.array(billItemSchema).describe('Line items for the bill')
    })
  )
  .output(
    z.object({
      bill: z.record(z.string(), z.any()).describe('The newly created bill')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let billData: Record<string, any> = {
      contact: ctx.input.contactId,
      reference: ctx.input.reference,
      dated_on: ctx.input.datedOn,
      due_on: ctx.input.dueOn
    };

    if (ctx.input.projectId) billData.project = ctx.input.projectId;
    if (ctx.input.currency) billData.currency = ctx.input.currency;
    if (ctx.input.comments) billData.comments = ctx.input.comments;

    billData.bill_items = ctx.input.billItems.map(item => {
      let mapped: Record<string, any> = {
        category: item.category,
        total_value: item.totalValue
      };
      if (item.description) mapped.description = item.description;
      if (item.salesTaxRate) mapped.sales_tax_rate = item.salesTaxRate;
      if (item.quantity !== undefined) mapped.quantity = item.quantity;
      if (item.unitPrice) mapped.unit_price = item.unitPrice;
      return mapped;
    });

    let bill = await client.createBill(billData);

    return {
      output: { bill },
      message: `Created bill **${ctx.input.reference}** due on ${ctx.input.dueOn}`
    };
  })
  .build();
