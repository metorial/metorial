import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZohoDeskClient } from '../lib/client';
import { zohoServiceError } from '../lib/errors';
import type { Datacenter } from '../lib/urls';
import { spec } from '../spec';

export let deskGetTickets = SlateTool.create(spec, {
  name: 'Desk Get Tickets',
  key: 'desk_get_tickets',
  description: `List, search, or retrieve support tickets from Zoho Desk. Supports filtering by department, status, and keyword search. Can also list departments for reference.`,
  instructions: [
    'The orgId is required for all Zoho Desk operations.',
    'Provide ticketId to fetch a single ticket, or omit to list/search tickets.',
    'Use searchQuery for keyword-based search.',
    'Set includeDepartments to true to also return department list.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgId: z
        .string()
        .optional()
        .describe('Zoho Desk organization ID (required unless listOrganizations is true)'),
      listOrganizations: z
        .boolean()
        .optional()
        .describe('If true, list Desk organizations instead of tickets'),
      ticketId: z.string().optional().describe('Specific ticket ID to fetch'),
      searchQuery: z.string().optional().describe('Search keyword to find tickets'),
      departmentId: z.string().optional().describe('Filter by department ID'),
      status: z.string().optional().describe('Filter by ticket status'),
      from: z.number().optional().describe('Starting index for pagination (default 0)'),
      limit: z.number().optional().describe('Number of tickets to return (max 100)'),
      sortBy: z
        .string()
        .optional()
        .describe('Field to sort by (e.g., "modifiedTime", "createdTime")'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      includeDepartments: z
        .boolean()
        .optional()
        .describe('Also return the list of departments')
    })
  )
  .output(
    z.object({
      tickets: z.array(z.record(z.string(), z.any())).describe('Support tickets'),
      organizations: z
        .array(
          z.object({
            organizationId: z.string(),
            name: z.string().optional(),
            isDefault: z.boolean().optional()
          })
        )
        .optional()
        .describe('Desk organizations (if listOrganizations is true)'),
      departments: z
        .array(
          z.object({
            departmentId: z.string(),
            name: z.string()
          })
        )
        .optional()
        .describe('Departments (if includeDepartments is true)')
    })
  )
  .handleInvocation(async ctx => {
    let dc = (ctx.auth.datacenter || ctx.config.datacenter || 'us') as Datacenter;

    if (ctx.input.listOrganizations) {
      let result = await ZohoDeskClient.listOrganizations(ctx.auth.token, dc);
      let organizationRecords = result?.data || result?.organizations || result || [];
      if (!Array.isArray(organizationRecords)) organizationRecords = [];
      let organizations = organizationRecords.map((org: any) => ({
        organizationId: String(org.id),
        name: org.companyName || org.portalName,
        isDefault: org.isDefault === true || org.isDefault === 'true'
      }));
      return {
        output: { tickets: [], organizations },
        message: `Found **${organizations.length}** Zoho Desk organizations.`
      };
    }

    if (!ctx.input.orgId) {
      throw zohoServiceError('orgId is required unless listOrganizations is true');
    }

    let client = new ZohoDeskClient({
      token: ctx.auth.token,
      datacenter: dc,
      orgId: ctx.input.orgId
    });

    if (ctx.input.ticketId) {
      let ticket = await client.getTicket(ctx.input.ticketId);
      return {
        output: { tickets: [ticket] },
        message: `Fetched ticket **#${ticket?.ticketNumber || ctx.input.ticketId}**.`
      };
    }

    let tickets: any[];
    if (ctx.input.searchQuery) {
      let result = await client.searchTickets({
        searchStr: ctx.input.searchQuery,
        departmentId: ctx.input.departmentId,
        from: ctx.input.from,
        limit: ctx.input.limit,
        statusType: ctx.input.status
      });
      tickets = result?.data || [];
    } else {
      let result = await client.listTickets({
        departmentId: ctx.input.departmentId,
        status: ctx.input.status,
        from: ctx.input.from,
        limit: ctx.input.limit,
        sortBy: ctx.input.sortBy,
        sortOrder: ctx.input.sortOrder
      });
      tickets = result?.data || result || [];
      if (!Array.isArray(tickets)) tickets = [];
    }

    let departments: any[] | undefined;
    if (ctx.input.includeDepartments) {
      let deptResult = await client.getDepartments();
      departments = (deptResult?.data || deptResult || []).map((d: any) => ({
        departmentId: String(d.id),
        name: d.name
      }));
    }

    return {
      output: { tickets, departments },
      message: `Retrieved **${tickets.length}** tickets${departments ? ` and **${departments.length}** departments` : ''}.`
    };
  })
  .build();
