import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ticketSchema = z.object({
  ticketId: z.string().describe('Unique identifier of the ticket'),
  idSuffix: z.string().nullable().describe('Ticket ID suffix'),
  name: z.string().nullable().describe('Attendee full name'),
  firstName: z.string().nullable().describe('Attendee first name'),
  lastName: z.string().nullable().describe('Attendee last name'),
  email: z.string().nullable().describe('Attendee email'),
  phone: z.string().nullable().describe('Attendee phone'),
  title: z.string().nullable().describe('Ticket type title'),
  description: z.string().nullable().describe('Ticket description'),
  price: z.number().nullable().describe('Ticket price'),
  pdf: z.string().nullable().describe('PDF ticket URL'),
  arrivedAt: z.string().nullable().describe('Check-in timestamp'),
  createdAt: z.string().nullable().describe('When the ticket was created')
});

export let listTickets = SlateTool.create(spec, {
  name: 'List Tickets',
  key: 'list_tickets',
  description: `Retrieve a paginated list of event tickets with attendee details, pricing, and check-in status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      tickets: z.array(ticketSchema).describe('List of tickets'),
      totalCount: z.number().describe('Total number of tickets'),
      currentPage: z.number().describe('Current page'),
      lastPage: z.number().describe('Last page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTickets({ page: ctx.input.page });

    let tickets = result.data.map((t: any) => ({
      ticketId: String(t.id),
      idSuffix: t.id_suffix ?? null,
      name: t.name ?? null,
      firstName: t.first_name ?? null,
      lastName: t.last_name ?? null,
      email: t.email ?? null,
      phone: t.phone ?? null,
      title: t.title ?? null,
      description: t.description ?? null,
      price: t.price ?? null,
      pdf: t.pdf ?? null,
      arrivedAt: t.arrived_at ?? null,
      createdAt: t.created_at ?? null
    }));

    return {
      output: {
        tickets,
        totalCount: result.meta.total,
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page
      },
      message: `Found **${result.meta.total}** tickets (page ${result.meta.current_page} of ${result.meta.last_page}).`
    };
  })
  .build();

export let getTicket = SlateTool.create(spec, {
  name: 'Get Ticket',
  key: 'get_ticket',
  description: `Retrieve detailed information about a specific event ticket including attendee info and check-in status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z.string().describe('ID of the ticket to retrieve')
    })
  )
  .output(ticketSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let t = await client.getTicket(ctx.input.ticketId);

    return {
      output: {
        ticketId: String(t.id),
        idSuffix: t.id_suffix ?? null,
        name: t.name ?? null,
        firstName: t.first_name ?? null,
        lastName: t.last_name ?? null,
        email: t.email ?? null,
        phone: t.phone ?? null,
        title: t.title ?? null,
        description: t.description ?? null,
        price: t.price ?? null,
        pdf: t.pdf ?? null,
        arrivedAt: t.arrived_at ?? null,
        createdAt: t.created_at ?? null
      },
      message: `Retrieved ticket **${t.id}** for ${t.name ?? 'unknown attendee'}${t.arrived_at ? ' (checked in)' : ''}.`
    };
  })
  .build();
