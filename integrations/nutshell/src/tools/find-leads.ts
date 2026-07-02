import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let findLeads = SlateTool.create(spec, {
  name: 'Find Leads',
  key: 'find_leads',
  description: `Search and list leads (sales opportunities) in Nutshell CRM. Supports pagination, sorting, and filtering by status, assignee, and other criteria.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .record(z.string(), z.any())
        .optional()
        .describe('Filter criteria for leads (e.g., { "status": 1 } for open leads)'),
      orderBy: z.string().optional().describe('Field to sort by'),
      orderDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      limit: z.number().optional().describe('Number of results per page (default: 50)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      stubResponses: z
        .boolean()
        .optional()
        .describe('Return lightweight stub responses for faster performance')
    })
  )
  .output(
    z.object({
      leads: z
        .array(
          z.object({
            leadId: z.number().describe('ID of the lead'),
            name: z.string().optional().describe('Lead name/description'),
            status: z.string().optional().describe('Lead status'),
            value: z.any().optional().describe('Lead value'),
            entityType: z.string().optional().describe('Entity type')
          })
        )
        .describe('List of leads matching the criteria'),
      count: z.number().describe('Number of leads returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let results = await client.findLeads({
      query: ctx.input.query,
      orderBy: ctx.input.orderBy,
      orderDirection: ctx.input.orderDirection,
      limit: ctx.input.limit,
      page: ctx.input.page,
      stubResponses: ctx.input.stubResponses
    });

    let leads = results.map((l: any) => ({
      leadId: l.id,
      name: l.name || l.description,
      status: l.status,
      value: l.value,
      entityType: l.entityType
    }));

    return {
      output: {
        leads,
        count: leads.length
      },
      message: `Found **${leads.length}** lead(s).`
    };
  })
  .build();
