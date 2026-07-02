import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchServiceTickets = SlateTool.create(spec, {
  name: 'Search Service Tickets',
  key: 'search_service_tickets',
  description: `Search and list service tickets in AgencyZoom. Filter by status, category, priority, resolution, CSR, customer, date range, carrier, or policy type. Supports pagination with offset and limit.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      status: z.string().optional().describe('Filter by ticket status'),
      category: z.string().optional().describe('Filter by service category'),
      priority: z.string().optional().describe('Filter by ticket priority'),
      resolution: z.string().optional().describe('Filter by ticket resolution'),
      csrId: z
        .string()
        .optional()
        .describe('Filter by CSR (customer service representative) ID'),
      customerId: z.string().optional().describe('Filter by customer ID'),
      fromDate: z
        .string()
        .optional()
        .describe('Filter tickets created on or after this date (ISO 8601 format)'),
      toDate: z
        .string()
        .optional()
        .describe('Filter tickets created on or before this date (ISO 8601 format)'),
      carrier: z.string().optional().describe('Filter by carrier name or ID'),
      policyType: z.string().optional().describe('Filter by policy type'),
      offset: z.number().optional().describe('Number of records to skip for pagination'),
      limit: z.number().optional().describe('Maximum number of records to return')
    })
  )
  .output(
    z.object({
      tickets: z
        .array(
          z.object({
            ticketId: z.string().describe('Unique identifier of the service ticket'),
            customerId: z.string().describe('ID of the associated customer'),
            csrId: z.string().optional().describe('ID of the assigned CSR'),
            category: z.string().optional().describe('Service ticket category'),
            priority: z.string().optional().describe('Service ticket priority level'),
            status: z.string().optional().describe('Current status of the ticket'),
            resolution: z.string().optional().describe('Resolution of the ticket'),
            createdAt: z.string().optional().describe('Timestamp when the ticket was created')
          })
        )
        .describe('Array of service tickets matching the search criteria'),
      total: z.number().describe('Total number of tickets matching the search criteria')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let params: Record<string, any> = {};
    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.category) params.category = ctx.input.category;
    if (ctx.input.priority) params.priority = ctx.input.priority;
    if (ctx.input.resolution) params.resolution = ctx.input.resolution;
    if (ctx.input.csrId) params.csrId = ctx.input.csrId;
    if (ctx.input.customerId) params.customerId = ctx.input.customerId;
    if (ctx.input.fromDate) params.fromDate = ctx.input.fromDate;
    if (ctx.input.toDate) params.toDate = ctx.input.toDate;
    if (ctx.input.carrier) params.carrier = ctx.input.carrier;
    if (ctx.input.policyType) params.policyType = ctx.input.policyType;
    if (ctx.input.offset !== undefined) params.offset = ctx.input.offset;
    if (ctx.input.limit !== undefined) params.limit = ctx.input.limit;

    let result = await client.searchServiceTickets(params);

    let tickets = Array.isArray(result) ? result : (result?.data ?? result?.items ?? []);
    let total = result?.total ?? result?.count ?? tickets.length;

    let mappedTickets = tickets.map((t: any) => ({
      ticketId: t.ticketId ?? t.id ?? '',
      customerId: t.customerId ?? '',
      csrId: t.csrId,
      category: t.category,
      priority: t.priority,
      status: t.status,
      resolution: t.resolution,
      createdAt: t.createdAt ?? t.created
    }));

    return {
      output: {
        tickets: mappedTickets,
        total
      },
      message: `Found **${total}** service ticket(s).${mappedTickets.length < total ? ` Showing ${mappedTickets.length} result(s).` : ''}`
    };
  })
  .build();
