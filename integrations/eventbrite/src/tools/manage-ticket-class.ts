import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validateIntegerFields } from '../lib/validation';
import { spec } from '../spec';

let ticketClassSchema = z.object({
  ticketClassId: z.string().describe('The unique ID of the ticket class.'),
  name: z.string().optional().describe('Name of the ticket class.'),
  description: z.string().optional().describe('Description of the ticket class.'),
  cost: z.string().optional().describe('Formatted display price returned by Eventbrite.'),
  free: z.boolean().optional().describe('Whether the ticket is free.'),
  donation: z.boolean().optional().describe('Whether the ticket is a donation.'),
  quantityTotal: z.number().optional().describe('Total number of tickets available.'),
  quantitySold: z.number().optional().describe('Number of tickets sold.'),
  minimumQuantity: z.number().optional().describe('Minimum tickets per order.'),
  maximumQuantity: z.number().optional().describe('Maximum tickets per order.'),
  salesStart: z.string().optional().describe('When ticket sales start.'),
  salesEnd: z.string().optional().describe('When ticket sales end.'),
  hidden: z.boolean().optional().describe('Whether the ticket class is hidden.')
});

export let manageTicketClass = SlateTool.create(spec, {
  name: 'Manage Ticket Classes',
  key: 'manage_ticket_class',
  description: `Create, retrieve, update, delete, or list ticket classes for an event. Ticket classes define the types of tickets available (e.g., General Admission, VIP) with pricing, quantity, and sales configuration.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The action to perform.'),
      page: z.number().optional().describe('Page number for list results, starting at 1.'),
      continuation: z
        .string()
        .optional()
        .describe('Continuation token returned by the previous page.'),
      inventoryTierId: z
        .string()
        .optional()
        .describe(
          'Inventory tier ID. Required by Eventbrite when creating or updating tickets for a tiered event.'
        ),
      eventId: z.string().describe('The event ID the ticket class belongs to.'),
      ticketClassId: z
        .string()
        .optional()
        .describe('Required for get, update, and delete actions.'),
      name: z.string().optional().describe('Ticket class name. Required for create.'),
      description: z.string().optional().describe('Ticket class description.'),
      cost: z
        .string()
        .optional()
        .describe('Price string (e.g., "USD,1000" for $10.00). Omit for free tickets.'),
      free: z.boolean().optional().describe('Set to true for free tickets.'),
      donation: z.boolean().optional().describe('Set to true for donation-based tickets.'),
      quantityTotal: z.number().optional().describe('Total number of tickets available.'),
      minimumQuantity: z.number().optional().describe('Minimum tickets per order.'),
      maximumQuantity: z.number().optional().describe('Maximum tickets per order.'),
      salesStart: z.string().optional().describe('When ticket sales start (UTC).'),
      salesEnd: z.string().optional().describe('When ticket sales end (UTC).'),
      hidden: z
        .boolean()
        .optional()
        .describe('Whether the ticket class is hidden from public view.')
    })
  )
  .output(
    z.object({
      ticketClasses: z
        .array(ticketClassSchema)
        .optional()
        .describe('List of ticket classes (for list action).'),
      ticketClass: ticketClassSchema
        .optional()
        .describe('The retrieved, created, or updated ticket class.'),
      hasMore: z
        .boolean()
        .optional()
        .describe('Whether more ticket classes are available for list.'),
      continuation: z
        .string()
        .optional()
        .describe('Token to retrieve the next ticket-class page.'),
      deleted: z.boolean().optional().describe('Whether the ticket class was deleted.')
    })
  )
  .handleInvocation(async ctx => {
    validateIntegerFields(ctx.input, ['page'], 1);
    validateIntegerFields(ctx.input, ['quantityTotal']);
    validateIntegerFields(ctx.input, ['minimumQuantity', 'maximumQuantity'], 1);
    if (
      ctx.input.minimumQuantity !== undefined &&
      ctx.input.maximumQuantity !== undefined &&
      ctx.input.minimumQuantity > ctx.input.maximumQuantity
    ) {
      throw createApiServiceError('minimumQuantity must not exceed maximumQuantity.');
    }
    if (ctx.input.action === 'create' || ctx.input.action === 'update') {
      if (ctx.input.free && ctx.input.donation)
        throw createApiServiceError('A ticket class cannot be both free and donation-based.');
      if ((ctx.input.free || ctx.input.donation) && ctx.input.cost !== undefined)
        throw createApiServiceError('Omit cost for free or donation-based ticket classes.');
      if (
        ctx.input.action === 'create' &&
        !ctx.input.free &&
        !ctx.input.donation &&
        ctx.input.cost === undefined
      )
        throw createApiServiceError(
          'Provide cost for a paid ticket, or set free or donation to true.'
        );
    }
    let client = new Client({ token: ctx.auth.token });
    let { action, eventId, ticketClassId } = ctx.input;

    if (action === 'list') {
      let result = await client.listTicketClasses(eventId, {
        page: ctx.input.page,
        continuation: ctx.input.continuation
      });
      let ticketClasses = (result.ticket_classes || []).map((tc: any) => ({
        ticketClassId: tc.id,
        name: tc.name ?? undefined,
        description: tc.description ?? undefined,
        cost: tc.cost?.display ?? undefined,
        free: tc.free ?? undefined,
        donation: tc.donation ?? undefined,
        quantityTotal: tc.quantity_total ?? tc.capacity ?? undefined,
        quantitySold: tc.quantity_sold ?? undefined,
        minimumQuantity: tc.minimum_quantity ?? undefined,
        maximumQuantity: tc.maximum_quantity ?? undefined,
        salesStart: tc.sales_start ?? undefined,
        salesEnd: tc.sales_end ?? undefined,
        hidden: tc.hidden ?? undefined
      }));

      return {
        output: {
          ticketClasses,
          hasMore: result.pagination?.has_more_items ?? false,
          continuation: result.pagination?.continuation ?? undefined
        },
        message: `Found **${ticketClasses.length}** ticket classes for event \`${eventId}\`.`
      };
    }

    if (action === 'get') {
      if (!ticketClassId) throw createApiServiceError('Ticket class ID is required for get.');
      let result = await client.getTicketClass(eventId, ticketClassId);
      return {
        output: {
          ticketClass: {
            ticketClassId: result.id,
            name: result.name ?? undefined,
            description: result.description ?? undefined,
            cost: result.cost?.display ?? undefined,
            free: result.free ?? undefined,
            donation: result.donation ?? undefined,
            quantityTotal: result.quantity_total ?? result.capacity ?? undefined,
            quantitySold: result.quantity_sold ?? undefined,
            minimumQuantity: result.minimum_quantity ?? undefined,
            maximumQuantity: result.maximum_quantity ?? undefined,
            salesStart: result.sales_start ?? undefined,
            salesEnd: result.sales_end ?? undefined,
            hidden: result.hidden ?? undefined
          }
        },
        message: `Retrieved ticket class \`${result.id}\`.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name)
        throw createApiServiceError('Name is required to create a ticket class.');
      let result = await client.createTicketClass(eventId, {
        name: ctx.input.name,
        quantity_total: ctx.input.quantityTotal,
        cost: ctx.input.cost,
        donation: ctx.input.donation,
        free: ctx.input.free,
        minimum_quantity: ctx.input.minimumQuantity,
        maximum_quantity: ctx.input.maximumQuantity,
        description: ctx.input.description,
        sales_start: ctx.input.salesStart,
        sales_end: ctx.input.salesEnd,
        inventory_tier_id: ctx.input.inventoryTierId,
        hidden: ctx.input.hidden
      });

      return {
        output: {
          ticketClass: {
            ticketClassId: result.id,
            name: result.name ?? undefined,
            description: result.description ?? undefined,
            cost: result.cost?.display ?? undefined,
            free: result.free ?? undefined,
            donation: result.donation ?? undefined,
            quantityTotal: result.quantity_total ?? result.capacity ?? undefined,
            quantitySold: result.quantity_sold ?? undefined,
            minimumQuantity: result.minimum_quantity ?? undefined,
            maximumQuantity: result.maximum_quantity ?? undefined,
            salesStart: result.sales_start ?? undefined,
            salesEnd: result.sales_end ?? undefined,
            hidden: result.hidden ?? undefined
          }
        },
        message: `Created ticket class **${result.name}** with ID \`${result.id}\`.`
      };
    }

    if (action === 'update') {
      if (!ticketClassId)
        throw createApiServiceError('Ticket class ID is required for update.');
      let result = await client.updateTicketClass(eventId, ticketClassId, {
        name: ctx.input.name,
        quantity_total: ctx.input.quantityTotal,
        cost: ctx.input.cost,
        donation: ctx.input.donation,
        free: ctx.input.free,
        minimum_quantity: ctx.input.minimumQuantity,
        maximum_quantity: ctx.input.maximumQuantity,
        description: ctx.input.description,
        sales_start: ctx.input.salesStart,
        sales_end: ctx.input.salesEnd,
        inventory_tier_id: ctx.input.inventoryTierId,
        hidden: ctx.input.hidden
      });

      return {
        output: {
          ticketClass: {
            ticketClassId: result.id,
            name: result.name ?? undefined,
            description: result.description ?? undefined,
            cost: result.cost?.display ?? undefined,
            free: result.free ?? undefined,
            donation: result.donation ?? undefined,
            quantityTotal: result.quantity_total ?? result.capacity ?? undefined,
            quantitySold: result.quantity_sold ?? undefined,
            minimumQuantity: result.minimum_quantity ?? undefined,
            maximumQuantity: result.maximum_quantity ?? undefined,
            salesStart: result.sales_start ?? undefined,
            salesEnd: result.sales_end ?? undefined,
            hidden: result.hidden ?? undefined
          }
        },
        message: `Updated ticket class **${result.name}** (\`${result.id}\`).`
      };
    }

    if (action === 'delete') {
      if (!ticketClassId)
        throw createApiServiceError('Ticket class ID is required for delete.');
      await client.deleteTicketClass(eventId, ticketClassId);

      return {
        output: { deleted: true },
        message: `Deleted ticket class \`${ticketClassId}\` from event \`${eventId}\`.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
