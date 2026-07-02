import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLeads = SlateTool.create(spec, {
  name: 'List Leads',
  key: 'list_leads',
  description: `Search and list leads with flexible filtering by status, pipeline step, user, email, tags, date range, and custom fields. Supports pagination via limit and offset. Returns a total count header for building paginated views.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['todo', 'standby', 'won', 'lost', 'cancelled'])
        .optional()
        .describe('Filter by lead status'),
      step: z.string().optional().describe('Filter by pipeline step name'),
      userId: z.number().optional().describe('Filter by assigned user ID'),
      email: z.string().optional().describe('Filter by contact email'),
      tags: z.string().optional().describe('Filter by tag name'),
      starred: z.boolean().optional().describe('Filter by starred status'),
      fieldKey: z.string().optional().describe('Custom field key to filter by'),
      fieldValue: z
        .string()
        .optional()
        .describe('Custom field value to filter by (requires fieldKey)'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Only return leads updated after this ISO 8601 timestamp'),
      startDate: z
        .string()
        .optional()
        .describe('Start date for date range filter (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('End date for date range filter (YYYY-MM-DD)'),
      dateRangeType: z
        .string()
        .optional()
        .describe('Date range type: created, updated, closed, remind'),
      limit: z.number().optional().describe('Maximum number of leads to return (default 100)'),
      offset: z.number().optional().describe('Number of leads to skip for pagination'),
      order: z
        .string()
        .optional()
        .describe('Sort field (e.g. created_at, updated_at, amount)'),
      direction: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      includeUnassigned: z.boolean().optional().describe('Include unassigned leads in results')
    })
  )
  .output(
    z.object({
      leads: z.array(
        z.object({
          leadId: z.number().describe('ID of the lead'),
          title: z.string().describe('Title of the lead'),
          status: z.string().describe('Current status'),
          step: z.string().optional().describe('Pipeline step'),
          amount: z.number().optional().describe('Deal amount'),
          userId: z.number().optional().describe('Assigned user ID'),
          tags: z.array(z.string()).optional().describe('Tags'),
          starred: z.boolean().optional().describe('Starred status'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp')
        })
      ),
      totalCount: z.number().optional().describe('Total number of matching leads')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let result = await client.listLeads({
      status: ctx.input.status,
      step: ctx.input.step,
      userId: ctx.input.userId,
      email: ctx.input.email,
      tags: ctx.input.tags,
      starred: ctx.input.starred,
      fieldKey: ctx.input.fieldKey,
      fieldValue: ctx.input.fieldValue,
      updatedAfter: ctx.input.updatedAfter,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      dateRangeType: ctx.input.dateRangeType,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      order: ctx.input.order,
      direction: ctx.input.direction,
      includeUnassigned: ctx.input.includeUnassigned
    });

    let leads = result.leads.map((lead: any) => ({
      leadId: lead.id,
      title: lead.title,
      status: lead.status,
      step: lead.step,
      amount: lead.amount,
      userId: lead.user_id,
      tags: lead.tags,
      starred: lead.starred,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at
    }));

    return {
      output: {
        leads,
        totalCount: result.totalCount
      },
      message: `Found **${leads.length}** leads${result.totalCount ? ` (${result.totalCount} total)` : ''}.`
    };
  })
  .build();
