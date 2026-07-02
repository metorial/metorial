import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ticketClassSchema = z.object({
  ticketClassId: z.string().describe('The unique ID of the ticket class.'),
  name: z.string().optional().describe('Name of the ticket class.'),
  description: z.string().optional().describe('Description of the ticket class.'),
  cost: z.string().optional().describe('Price of the ticket (e.g., "USD,1000" for $10.00).'),
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
  description: `Create, update, delete, or list ticket classes for an event. Ticket classes define the types of tickets available (e.g., General Admission, VIP) with pricing, quantity, and sales configuration.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete'])
        .describe('The action to perform.'),
      eventId: z.string().describe('The event ID the ticket class belongs to.'),
      ticketClassId: z.string().optional().describe('Required for update and delete actions.'),
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
        .describe('The created or updated ticket class.'),
      deleted: z.boolean().optional().describe('Whether the ticket class was deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, eventId, ticketClassId } = ctx.input;

    if (action === 'list') {
      let result = await client.listTicketClasses(eventId);
      let ticketClasses = (result.ticket_classes || []).map((tc: any) => ({
        ticketClassId: tc.id,
        name: tc.name,
        description: tc.description,
        cost: tc.cost?.display,
        free: tc.free,
        donation: tc.donation,
        quantityTotal: tc.quantity_total,
        quantitySold: tc.quantity_sold,
        minimumQuantity: tc.minimum_quantity,
        maximumQuantity: tc.maximum_quantity,
        salesStart: tc.sales_start,
        salesEnd: tc.sales_end,
        hidden: tc.hidden
      }));

      return {
        output: { ticketClasses },
        message: `Found **${ticketClasses.length}** ticket classes for event \`${eventId}\`.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required to create a ticket class.');
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
        hidden: ctx.input.hidden
      });

      return {
        output: {
          ticketClass: {
            ticketClassId: result.id,
            name: result.name,
            description: result.description,
            cost: result.cost?.display,
            free: result.free,
            donation: result.donation,
            quantityTotal: result.quantity_total,
            quantitySold: result.quantity_sold,
            minimumQuantity: result.minimum_quantity,
            maximumQuantity: result.maximum_quantity,
            salesStart: result.sales_start,
            salesEnd: result.sales_end,
            hidden: result.hidden
          }
        },
        message: `Created ticket class **${result.name}** with ID \`${result.id}\`.`
      };
    }

    if (action === 'update') {
      if (!ticketClassId) throw new Error('Ticket class ID is required for update.');
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
        hidden: ctx.input.hidden
      });

      return {
        output: {
          ticketClass: {
            ticketClassId: result.id,
            name: result.name,
            description: result.description,
            cost: result.cost?.display,
            free: result.free,
            donation: result.donation,
            quantityTotal: result.quantity_total,
            quantitySold: result.quantity_sold,
            minimumQuantity: result.minimum_quantity,
            maximumQuantity: result.maximum_quantity,
            salesStart: result.sales_start,
            salesEnd: result.sales_end,
            hidden: result.hidden
          }
        },
        message: `Updated ticket class **${result.name}** (\`${result.id}\`).`
      };
    }

    if (action === 'delete') {
      if (!ticketClassId) throw new Error('Ticket class ID is required for delete.');
      await client.deleteTicketClass(eventId, ticketClassId);

      return {
        output: { deleted: true },
        message: `Deleted ticket class \`${ticketClassId}\` from event \`${eventId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
