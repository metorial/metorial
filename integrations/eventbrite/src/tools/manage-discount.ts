import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { validateIntegerFields } from '../lib/validation';
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
      organizationId: organizationIdSchema,
      scope: z
        .string()
        .optional()
        .describe(
          'Provider discount scope for list. Use event with eventId for event discounts; otherwise supply the desired organization discount scope.'
        ),
      codeFilter: z
        .string()
        .optional()
        .describe('For list, match part of a discount code or name.'),
      pageSize: z.number().optional().describe('Number of results per list page.'),
      discountId: z
        .string()
        .optional()
        .describe('Discount ID (required for get, update, delete).'),
      code: z.string().optional().describe('Discount code (required for create).'),
      type: z
        .enum(['coded', 'access', 'hold', 'public'])
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
      startDate: z
        .string()
        .optional()
        .describe(
          'When the discount becomes active, in event-local YYYY-MM-DDTHH:mm:ss format.'
        ),
      endDate: z
        .string()
        .optional()
        .describe('When the discount expires, in event-local YYYY-MM-DDTHH:mm:ss format.'),
      page: z.number().optional().describe('Page number for list pagination.'),
      continuation: z
        .string()
        .optional()
        .describe('Continuation token returned by the previous page.')
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
      continuation: z.string().optional().describe('Token to retrieve the next page.'),
      hasMore: z.boolean().optional().describe('Whether there are more pages (for list).'),
      deleted: z.boolean().optional().describe('Whether the discount was deleted.')
    })
  )
  .handleInvocation(async ctx => {
    validateIntegerFields(ctx.input, ['page', 'pageSize'], 1);
    validateIntegerFields(ctx.input, ['quantityAvailable']);
    if (ctx.input.action === 'create' || ctx.input.action === 'update') {
      if (ctx.input.amountOff !== undefined && ctx.input.percentOff !== undefined)
        throw createApiServiceError('Provide either amountOff or percentOff, not both.');
      for (let [field, value, min, max] of [
        ['amountOff', ctx.input.amountOff, 0.01, 99999.99],
        ['percentOff', ctx.input.percentOff, 1, 100]
      ] as const) {
        if (
          value !== undefined &&
          (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) < min || Number(value) > max)
        )
          throw createApiServiceError(
            `${field} must be a decimal between ${min} and ${max} with at most two decimal places.`
          );
      }
      if (ctx.input.ticketClassIds?.length && !ctx.input.eventId)
        throw createApiServiceError('eventId is required when ticketClassIds are supplied.');
    }
    let client = new Client({ token: ctx.auth.token });

    let mapDiscount = (d: any) => ({
      discountId: d.id,
      code: d.code ?? undefined,
      type: d.type ?? undefined,
      amountOff: d.amount_off ?? undefined,
      percentOff: d.percent_off ?? undefined,
      eventId: d.event_id ?? undefined,
      quantityAvailable: d.quantity_available ?? undefined,
      quantitySold: d.quantity_sold ?? undefined,
      startDate: d.start_date ?? undefined,
      endDate: d.end_date ?? undefined
    });

    if (ctx.input.action === 'list') {
      let orgId = ctx.input.organizationId || ctx.config.organizationId;
      if (!orgId) throw createApiServiceError('Organization ID is required for list.');
      let scope = ctx.input.scope ?? (ctx.input.eventId ? 'event' : undefined);
      if (!scope)
        throw createApiServiceError(
          'Provide scope for discount listing, or eventId to list discounts for one event.'
        );
      if (scope === 'event' && !ctx.input.eventId)
        throw createApiServiceError('eventId is required for the event discount scope.');
      let result = await client.listOrganizationDiscounts(orgId, {
        scope,
        event_id: ctx.input.eventId,
        code: ctx.input.code,
        code_filter: ctx.input.codeFilter,
        type: ctx.input.type,
        page_size: ctx.input.pageSize,
        continuation: ctx.input.continuation,
        page: ctx.input.page
      });
      let discounts = (result.discounts || []).map(mapDiscount);
      return {
        output: {
          discounts,
          continuation: result.pagination?.continuation ?? undefined,
          hasMore: result.pagination?.has_more_items || false
        },
        message: `Found **${discounts.length}** discounts.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.discountId)
        throw createApiServiceError('Discount ID is required for get.');
      let discount = await client.getDiscount(ctx.input.discountId);
      return {
        output: { discount: mapDiscount(discount) },
        message: `Retrieved discount **${discount.code}**.`
      };
    }

    if (ctx.input.action === 'create') {
      let orgId = ctx.input.organizationId || ctx.config.organizationId;
      if (!orgId) throw createApiServiceError('Organization ID is required for create.');
      if (!ctx.input.code) throw createApiServiceError('Discount code is required.');
      if (!ctx.input.type) throw createApiServiceError('Discount type is required.');

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
      if (!ctx.input.discountId)
        throw createApiServiceError('Discount ID is required for update.');
      let discount = await client.updateDiscount(ctx.input.discountId, {
        code: ctx.input.code,
        type: ctx.input.type,
        event_id: ctx.input.eventId,
        ticket_class_ids: ctx.input.ticketClassIds,
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
      if (!ctx.input.discountId)
        throw createApiServiceError('Discount ID is required for delete.');
      await client.deleteDiscount(ctx.input.discountId);
      return {
        output: { deleted: true },
        message: `Deleted discount \`${ctx.input.discountId}\`.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
