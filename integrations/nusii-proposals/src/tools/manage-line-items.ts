import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  lineItemId: z.string(),
  sectionId: z.number(),
  name: z.string(),
  position: z.number(),
  costType: z.string(),
  recurringType: z.string().nullable(),
  perType: z.string().nullable(),
  quantity: z.number().nullable(),
  updatedAt: z.string(),
  createdAt: z.string(),
  currency: z.string(),
  amountInCents: z.number(),
  amountFormatted: z.string(),
  totalInCents: z.number(),
  totalFormatted: z.string()
});

export let listLineItems = SlateTool.create(spec, {
  name: 'List Line Items',
  key: 'list_line_items',
  description: `Retrieve line items, either all items across the account (paginated) or all items within a specific cost section.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sectionId: z
        .string()
        .optional()
        .describe(
          'Filter by section ID (returns all items in that section without pagination)'
        ),
      page: z
        .number()
        .optional()
        .describe('Page number when listing all items (defaults to 1)'),
      perPage: z
        .number()
        .optional()
        .describe('Items per page when listing all items (defaults to 25)')
    })
  )
  .output(
    z.object({
      lineItems: z.array(lineItemSchema),
      currentPage: z.number().nullable(),
      totalPages: z.number().nullable(),
      totalCount: z.number().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.sectionId) {
      let items = await client.listLineItemsBySection(ctx.input.sectionId);
      return {
        output: {
          lineItems: items,
          currentPage: null,
          totalPages: null,
          totalCount: null
        },
        message: `Found **${items.length}** line items in section ${ctx.input.sectionId}.`
      };
    }

    let result = await client.listLineItems(ctx.input.page, ctx.input.perPage);
    return {
      output: {
        lineItems: result.items,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPages,
        totalCount: result.pagination.totalCount
      },
      message: `Found **${result.pagination.totalCount}** line items (page ${result.pagination.currentPage} of ${result.pagination.totalPages}).`
    };
  })
  .build();

export let createLineItem = SlateTool.create(spec, {
  name: 'Create Line Item',
  key: 'create_line_item',
  description: `Add a pricing line item to a cost section. Supports fixed, recurring (monthly, yearly, hourly, etc.), and per-unit pricing. Amounts are specified in cents.`,
  instructions: [
    'For "fixed" cost type, only set amount.',
    'For "recurring" cost type, also set recurringType (e.g. "monthly", "yearly", "hourly").',
    'For "per" cost type, set perType (e.g. "per_unit", "per_hour") and quantity.'
  ]
})
  .input(
    z.object({
      sectionId: z.string().describe('The cost section ID to add the line item to'),
      name: z.string().describe('Name/description of the line item'),
      costType: z
        .enum(['fixed', 'recurring', 'per'])
        .optional()
        .describe('Pricing type: fixed, recurring, or per-unit'),
      recurringType: z
        .string()
        .optional()
        .describe(
          'Interval for recurring items (e.g. monthly, yearly, hourly, weekly, quarterly)'
        ),
      perType: z
        .string()
        .optional()
        .describe('Unit type for per-unit items (e.g. per_unit, per_hour, per_item)'),
      position: z.number().optional().describe('Position/order within the section'),
      quantity: z.number().optional().describe('Quantity for per-unit items'),
      amount: z.number().optional().describe('Amount in cents (e.g. 10000 = $100.00)')
    })
  )
  .output(lineItemSchema)
  .handleInvocation(async ctx => {
    let { sectionId, ...data } = ctx.input;
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createLineItem(sectionId, data);

    return {
      output: result,
      message: `Created line item **"${result.name}"** — ${result.amountFormatted} (ID: ${result.lineItemId}).`
    };
  })
  .build();

export let updateLineItem = SlateTool.create(spec, {
  name: 'Update Line Item',
  key: 'update_line_item',
  description: `Update an existing line item's name, cost type, amount, quantity, or position. Only provided fields will be updated. Amounts are in cents.`
})
  .input(
    z.object({
      lineItemId: z.string().describe('The ID of the line item to update'),
      name: z.string().optional().describe('Updated name/description'),
      costType: z
        .enum(['fixed', 'recurring', 'per'])
        .optional()
        .describe('Updated pricing type'),
      recurringType: z.string().optional().describe('Updated recurring interval'),
      perType: z.string().optional().describe('Updated per-unit type'),
      position: z.number().optional().describe('Updated position/order'),
      quantity: z.number().optional().describe('Updated quantity'),
      amount: z.number().optional().describe('Updated amount in cents')
    })
  )
  .output(lineItemSchema)
  .handleInvocation(async ctx => {
    let { lineItemId, ...updateData } = ctx.input;
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateLineItem(lineItemId, updateData);

    return {
      output: result,
      message: `Updated line item **"${result.name}"** — ${result.totalFormatted} (ID: ${result.lineItemId}).`
    };
  })
  .build();

export let deleteLineItem = SlateTool.create(spec, {
  name: 'Delete Line Item',
  key: 'delete_line_item',
  description: `Permanently delete a line item from a cost section.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      lineItemId: z.string().describe('The ID of the line item to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteLineItem(ctx.input.lineItemId);

    return {
      output: { success: true },
      message: `Deleted line item with ID **${ctx.input.lineItemId}**.`
    };
  })
  .build();
