import { createApiServiceError, SlateTool } from 'slates';
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

let listTicketsOutputSchema = z.object({
  tickets: z.array(ticketSchema).describe('List of tickets'),
  totalCount: z.number().describe('Total number of tickets'),
  currentPage: z.number().describe('Current page'),
  lastPage: z.number().describe('Last page')
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
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Items per page, from 1 to 100')
    })
  )
  .output(listTicketsOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTickets({
      page: ctx.input.page,
      per_page: ctx.input.perPage
    });

    let tickets = result.data.map((t: any) => ({
      ticketId: String(t.id),
      idSuffix: t.id_suffix,
      name: t.name,
      firstName: t.first_name,
      lastName: t.last_name,
      email: t.email,
      phone: t.phone,
      title: t.title,
      description: t.description,
      price: t.price,
      pdf: t.pdf,
      arrivedAt: t.checked_in_at,
      createdAt: t.created_at
    }));

    return {
      output: client.output(listTicketsOutputSchema, {
        tickets,
        totalCount: result.meta.total,
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page
      }),
      message: client.publicData(
        `Found **${result.meta.total}** tickets (page ${result.meta.current_page} of ${result.meta.last_page}).`
      )
    };
  })
  .build();

let getTicketOutputSchema = ticketSchema;

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
  .output(getTicketOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let t = await client.getTicket(ctx.input.ticketId);
    // The provider's PDF field is a download URL; preserve its public metadata contract.
    if (t.pdf !== null && t.pdf !== undefined && t.pdf !== '') {
      let url: URL;
      try {
        url = new URL(t.pdf);
      } catch {
        throw createApiServiceError('Givebutter returned an invalid ticket PDF URL.');
      }
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        (url.port && url.port !== '443')
      )
        throw createApiServiceError('Givebutter returned an unsafe ticket PDF URL.');
      await ctx.addAttachment({
        type: 'url',
        url: url.toString(),
        mimeType: 'application/pdf'
      });
    }

    return {
      output: client.output(getTicketOutputSchema, {
        ticketId: String(t.id),
        idSuffix: t.id_suffix,
        name: t.name,
        firstName: t.first_name,
        lastName: t.last_name,
        email: t.email,
        phone: t.phone,
        title: t.title,
        description: t.description,
        price: t.price,
        pdf: t.pdf,
        arrivedAt: t.checked_in_at,
        createdAt: t.created_at
      }),
      message: client.publicData(
        `Retrieved ticket **${t.id}** for ${t.name ?? 'unknown attendee'}${t.checked_in_at ? ' (checked in)' : ''}.`
      )
    };
  })
  .build();
