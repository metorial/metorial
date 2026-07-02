import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let discountOutputSchema = z.object({
  discountId: z.string().describe('The unique discount ID.'),
  code: z.string().optional().describe('The discount code.'),
  type: z.string().optional().describe('Discount type (e.g., "coded", "access", "hold").'),
  amountOff: z.string().optional().describe('Fixed amount discount.'),
  percentOff: z.string().optional().describe('Percentage discount.'),
  eventId: z.string().optional().describe('The event the discount applies to.'),
  quantityAvailable: z.number().optional().describe('Number of uses available.'),
  quantitySold: z.number().optional().describe('Number of times used.'),
  startDate: z.string().optional().describe('When the discount becomes active.'),
  endDate: z.string().optional().describe('When the discount expires.')
});

export let manageDiscount = SlateTool.create(spec, {
  name: 'Manage Discounts',
  key: 'manage_discount',
  description: `Create, update, delete, get, or list discount codes for an organization. Discounts can be percentage-based or fixed-amount and can be scoped to specific events or ticket classes.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The action to perform.'),
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID (for list and create). Falls back to configured value.'),
      discountId: z
        .string()
        .optional()
        .describe('Discount ID (required for get, update, delete).'),
      code: z.string().optional().describe('Discount code (required for create).'),
      type: z
        .enum(['coded', 'access', 'hold'])
        .optional()
        .describe('Type of discount (required for create).'),
      amountOff: z
        .string()
        .optional()
        .describe('Fixed amount off (e.g., "5.00"). Mutually exclusive with percentOff.'),
      percentOff: z
        .string()
        .optional()
        .describe('Percentage off (e.g., "20.00"). Mutually exclusive with amountOff.'),
      eventId: z.string().optional().describe('Scope the discount to a specific event.'),
      ticketClassIds: z
        .array(z.string())
        .optional()
        .describe('Scope the discount to specific ticket classes.'),
      quantityAvailable: z
        .number()
        .optional()
        .describe('Number of times the discount can be used.'),
      startDate: z.string().optional().describe('When the discount becomes active (UTC).'),
      endDate: z.string().optional().describe('When the discount expires (UTC).'),
      page: z.number().optional().describe('Page number for list pagination.')
    })
  )
  .output(
    z.object({
      discount: discountOutputSchema
        .optional()
        .describe('The discount (for get, create, update).'),
      discounts: z
        .array(discountOutputSchema)
        .optional()
        .describe('List of discounts (for list).'),
      hasMore: z.boolean().optional().describe('Whether there are more pages (for list).'),
      deleted: z.boolean().optional().describe('Whether the discount was deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mapDiscount = (d: any) => ({
      discountId: d.id,
      code: d.code,
      type: d.type,
      amountOff: d.amount_off,
      percentOff: d.percent_off,
      eventId: d.event_id,
      quantityAvailable: d.quantity_available,
      quantitySold: d.quantity_sold,
      startDate: d.start_date,
      endDate: d.end_date
    });

    if (ctx.input.action === 'list') {
      let orgId = ctx.input.organizationId || ctx.config.organizationId;
      if (!orgId) throw new Error('Organization ID is required for list.');
      let result = await client.listOrganizationDiscounts(orgId, { page: ctx.input.page });
      let discounts = (result.discounts || []).map(mapDiscount);
      return {
        output: { discounts, hasMore: result.pagination?.has_more_items || false },
        message: `Found **${discounts.length}** discounts.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.discountId) throw new Error('Discount ID is required for get.');
      let discount = await client.getDiscount(ctx.input.discountId);
      return {
        output: { discount: mapDiscount(discount) },
        message: `Retrieved discount **${discount.code}**.`
      };
    }

    if (ctx.input.action === 'create') {
      let orgId = ctx.input.organizationId || ctx.config.organizationId;
      if (!orgId) throw new Error('Organization ID is required for create.');
      if (!ctx.input.code) throw new Error('Discount code is required.');
      if (!ctx.input.type) throw new Error('Discount type is required.');

      let discount = await client.createDiscount(orgId, {
        code: ctx.input.code,
        type: ctx.input.type,
        amount_off: ctx.input.amountOff,
        percent_off: ctx.input.percentOff,
        event_id: ctx.input.eventId,
        ticket_class_ids: ctx.input.ticketClassIds,
        quantity_available: ctx.input.quantityAvailable,
        start_date: ctx.input.startDate,
        end_date: ctx.input.endDate
      });

      return {
        output: { discount: mapDiscount(discount) },
        message: `Created discount **${discount.code}** with ID \`${discount.id}\`.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.discountId) throw new Error('Discount ID is required for update.');
      let discount = await client.updateDiscount(ctx.input.discountId, {
        code: ctx.input.code,
        amount_off: ctx.input.amountOff,
        percent_off: ctx.input.percentOff,
        quantity_available: ctx.input.quantityAvailable,
        start_date: ctx.input.startDate,
        end_date: ctx.input.endDate
      });
      return {
        output: { discount: mapDiscount(discount) },
        message: `Updated discount **${discount.code}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.discountId) throw new Error('Discount ID is required for delete.');
      await client.deleteDiscount(ctx.input.discountId);
      return {
        output: { deleted: true },
        message: `Deleted discount \`${ctx.input.discountId}\`.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
