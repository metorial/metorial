import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubSpotClient } from '../lib/client';
import { hubSpotActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let ticketPropertySchema = z
  .record(z.string(), z.any())
  .describe(
    'Ticket properties as key-value pairs (e.g., subject, content, hs_pipeline, hs_pipeline_stage, hs_ticket_priority, hubspot_owner_id)'
  );

let ticketOutputSchema = z.object({
  ticketId: z.string().describe('HubSpot ticket ID'),
  properties: z.record(z.string(), z.any()).describe('Ticket properties'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp'),
  archived: z.boolean().optional().describe('Whether the ticket is archived')
});

export let createTicket = SlateTool.create(spec, {
  name: 'Create Ticket',
  key: 'create_ticket',
  description: `Create a new support ticket in HubSpot. Provide ticket properties such as subject, content, pipeline stage, and priority.`,
  tags: { destructive: false, readOnly: false }
})
  .scopes(hubSpotActionScopes.createTicket)
  .input(
    z.object({
      properties: ticketPropertySchema,
      associations: z
        .array(
          z.object({
            to: z.object({ id: z.string().describe('ID of the object to associate with') }),
            types: z.array(
              z.object({
                associationCategory: z.string().describe('Association category'),
                associationTypeId: z.number().describe('Association type ID')
              })
            )
          })
        )
        .optional()
        .describe('Associations to create with the ticket (e.g., contacts, companies)')
    })
  )
  .output(ticketOutputSchema)
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.createObject(
      'tickets',
      ctx.input.properties,
      ctx.input.associations
    );

    return {
      output: {
        ticketId: result.id,
        properties: result.properties,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        archived: result.archived
      },
      message: `Created ticket **${result.properties.subject || ''}** (ID: ${result.id})`
    };
  })
  .build();

export let getTicket = SlateTool.create(spec, {
  name: 'Get Ticket',
  key: 'get_ticket',
  description: `Retrieve a support ticket from HubSpot by ID.`,
  tags: { readOnly: true }
})
  .scopes(hubSpotActionScopes.getTicket)
  .input(
    z.object({
      ticketId: z.string().describe('HubSpot ticket ID'),
      properties: z.array(z.string()).optional().describe('Specific properties to return'),
      associations: z
        .array(z.string())
        .optional()
        .describe('Associated object types to include')
    })
  )
  .output(ticketOutputSchema)
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.getObject(
      'tickets',
      ctx.input.ticketId,
      ctx.input.properties,
      ctx.input.associations
    );

    return {
      output: {
        ticketId: result.id,
        properties: result.properties,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        archived: result.archived
      },
      message: `Retrieved ticket **${result.properties.subject || ''}** (ID: ${result.id})`
    };
  })
  .build();

export let updateTicket = SlateTool.create(spec, {
  name: 'Update Ticket',
  key: 'update_ticket',
  description: `Update an existing ticket's properties in HubSpot. Use this to change ticket status, priority, assignment, or any other property.`,
  tags: { destructive: false, readOnly: false }
})
  .scopes(hubSpotActionScopes.updateTicket)
  .input(
    z.object({
      ticketId: z.string().describe('HubSpot ticket ID to update'),
      properties: ticketPropertySchema
    })
  )
  .output(ticketOutputSchema)
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.updateObject(
      'tickets',
      ctx.input.ticketId,
      ctx.input.properties
    );

    return {
      output: {
        ticketId: result.id,
        properties: result.properties,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        archived: result.archived
      },
      message: `Updated ticket (ID: ${result.id})`
    };
  })
  .build();

export let deleteTicket = SlateTool.create(spec, {
  name: 'Delete Ticket',
  key: 'delete_ticket',
  description: `Archive (soft delete) a ticket in HubSpot.`,
  tags: { destructive: true, readOnly: false }
})
  .scopes(hubSpotActionScopes.deleteTicket)
  .input(
    z.object({
      ticketId: z.string().describe('HubSpot ticket ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    await client.deleteObject('tickets', ctx.input.ticketId);

    return {
      output: { success: true },
      message: `Archived ticket (ID: ${ctx.input.ticketId})`
    };
  })
  .build();

export let listTickets = SlateTool.create(spec, {
  name: 'List Tickets',
  key: 'list_tickets',
  description: `List support tickets from HubSpot with pagination support.`,
  tags: { readOnly: true }
})
  .scopes(hubSpotActionScopes.listTickets)
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of tickets to return (max 100)'),
      after: z.string().optional().describe('Pagination cursor for the next page'),
      properties: z.array(z.string()).optional().describe('Specific properties to return')
    })
  )
  .output(
    z.object({
      tickets: z.array(ticketOutputSchema).describe('List of tickets'),
      hasMore: z.boolean().describe('Whether more results are available'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page'),
      total: z.number().optional().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.listObjects(
      'tickets',
      ctx.input.limit || 10,
      ctx.input.after,
      ctx.input.properties
    );

    let tickets = (result.results || []).map((r: any) => ({
      ticketId: r.id,
      properties: r.properties,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      archived: r.archived
    }));

    return {
      output: {
        tickets,
        hasMore: !!result.paging?.next?.after,
        nextCursor: result.paging?.next?.after,
        total: result.total
      },
      message: `Retrieved **${tickets.length}** tickets${result.paging?.next?.after ? ' (more available)' : ''}`
    };
  })
  .build();
