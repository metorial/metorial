import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let serviceTicketUpdatedTrigger = SlateTrigger.create(spec, {
  name: 'Service Ticket Updated',
  key: 'service_ticket_updated',
  description:
    'Triggers when a service ticket is created or updated in AgencyZoom. Polls for recently modified service tickets.'
})
  .input(
    z.object({
      ticketId: z.string().describe('Unique ID of the service ticket'),
      customerId: z.string().optional().describe('ID of the associated customer'),
      csrId: z.string().optional().describe('ID of the assigned CSR'),
      category: z.string().optional().describe('Service ticket category'),
      priority: z.string().optional().describe('Service ticket priority'),
      status: z.string().optional().describe('Current status of the ticket'),
      resolution: z.string().optional().describe('Resolution of the ticket'),
      createdAt: z.string().optional().describe('ISO timestamp when the ticket was created'),
      updatedAt: z
        .string()
        .optional()
        .describe('ISO timestamp when the ticket was last updated'),
      raw: z.any().optional().describe('Raw ticket data from the API')
    })
  )
  .output(
    z.object({
      ticketId: z.string().describe('Unique ID of the service ticket'),
      customerId: z.string().optional().describe('ID of the associated customer'),
      csrId: z.string().optional().describe('ID of the assigned CSR'),
      category: z.string().optional().describe('Service ticket category'),
      priority: z.string().optional().describe('Service ticket priority'),
      status: z.string().optional().describe('Current status of the ticket'),
      resolution: z.string().optional().describe('Resolution of the ticket'),
      createdAt: z.string().optional().describe('ISO timestamp when the ticket was created'),
      updatedAt: z
        .string()
        .optional()
        .describe('ISO timestamp when the ticket was last updated'),
      raw: z.any().optional().describe('Full ticket data from the API')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiKey: ctx.auth.apiKey,
        apiSecret: ctx.auth.apiSecret
      });

      let lastPolledAt =
        ctx.state?.lastPolledAt || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      let result = await client.searchServiceTickets({
        fromDate: lastPolledAt,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        limit: 100
      });

      let tickets = Array.isArray(result)
        ? result
        : result?.data || result?.tickets || result?.items || [];

      let inputs = tickets.map((ticket: any) => ({
        ticketId: ticket.id || ticket.ticketId || ticket._id || String(ticket),
        customerId: ticket.customerId || ticket.customer?.id,
        csrId: ticket.csrId || ticket.csr?.id,
        category: ticket.category?.name || ticket.categoryName || ticket.category,
        priority: ticket.priority?.name || ticket.priorityName || ticket.priority,
        status: ticket.status,
        resolution: ticket.resolution?.name || ticket.resolutionName || ticket.resolution,
        createdAt: ticket.createdAt || ticket.dateCreated || ticket.created,
        updatedAt: ticket.updatedAt || ticket.dateModified || ticket.modified,
        raw: ticket
      }));

      return {
        inputs,
        updatedState: {
          lastPolledAt: new Date().toISOString()
        }
      };
    },
    handleEvent: async ctx => {
      let isNew = !ctx.input.updatedAt || ctx.input.createdAt === ctx.input.updatedAt;
      let eventType = isNew ? 'service_ticket.created' : 'service_ticket.updated';

      return {
        type: eventType,
        id: `${ctx.input.ticketId}-${ctx.input.updatedAt || ctx.input.createdAt || Date.now()}`,
        output: {
          ticketId: ctx.input.ticketId,
          customerId: ctx.input.customerId,
          csrId: ctx.input.csrId,
          category: ctx.input.category,
          priority: ctx.input.priority,
          status: ctx.input.status,
          resolution: ctx.input.resolution,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt,
          raw: ctx.input.raw
        }
      };
    }
  })
  .build();
