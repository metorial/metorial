import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listLeads = SlateTool.create(spec, {
  name: 'List Leads',
  key: 'list_leads',
  description: `List leads from a saved view in Freshsales. Use the **listFilters** tool first to get available view IDs. Supports pagination and sorting.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      viewId: z
        .number()
        .describe(
          'View ID to list leads from. Use the listFilters tool to get available views.'
        ),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      sort: z
        .string()
        .optional()
        .describe('Field to sort by (e.g. "created_at", "updated_at", "lead_score")'),
      sortType: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      leads: z.array(
        z.object({
          leadId: z.number(),
          firstName: z.string().nullable().optional(),
          lastName: z.string().nullable().optional(),
          displayName: z.string().nullable().optional(),
          email: z.string().nullable().optional(),
          jobTitle: z.string().nullable().optional(),
          city: z.string().nullable().optional(),
          country: z.string().nullable().optional(),
          leadScore: z.number().nullable().optional(),
          createdAt: z.string().nullable().optional(),
          updatedAt: z.string().nullable().optional()
        })
      ),
      total: z.number().optional().describe('Total number of records matching the view')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listLeads(ctx.input.viewId, {
      page: ctx.input.page,
      sort: ctx.input.sort,
      sortType: ctx.input.sortType
    });

    let leads = result.leads.map((l: Record<string, any>) => ({
      leadId: l.id,
      firstName: l.first_name,
      lastName: l.last_name,
      displayName: l.display_name,
      email: l.email,
      jobTitle: l.job_title,
      city: l.city,
      country: l.country,
      leadScore: l.lead_score,
      createdAt: l.created_at,
      updatedAt: l.updated_at
    }));

    return {
      output: {
        leads,
        total: result.meta?.total
      },
      message: `Found **${leads.length}** leads (total: ${result.meta?.total ?? 'unknown'}).`
    };
  })
  .build();
