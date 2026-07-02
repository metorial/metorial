import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getLeads = SlateTool.create(spec, {
  name: 'Get Leads',
  key: 'get_leads',
  description: `Retrieve leads from the Pipedrive Leads Inbox. Fetch a single lead by ID or list leads with optional filtering by archived status.
Returns lead properties including title, linked contacts, value, labels, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      leadId: z.string().optional().describe('Specific lead ID to fetch'),
      archivedStatus: z
        .enum(['archived', 'not_archived', 'all'])
        .optional()
        .describe('Filter by archived status'),
      start: z.number().optional().describe('Pagination start (0-based)'),
      limit: z.number().optional().describe('Number of results to return (max 500)'),
      sort: z.string().optional().describe('Sort field, e.g. "add_time ASC"')
    })
  )
  .output(
    z.object({
      leads: z
        .array(
          z.object({
            leadId: z.string().describe('Lead ID'),
            title: z.string().describe('Lead title'),
            personId: z.number().optional().nullable().describe('Linked person ID'),
            organizationId: z
              .number()
              .optional()
              .nullable()
              .describe('Linked organization ID'),
            isArchived: z.boolean().optional().describe('Archived status'),
            labelIds: z.array(z.string()).optional().describe('Assigned label IDs'),
            value: z
              .object({
                amount: z.number(),
                currency: z.string()
              })
              .optional()
              .nullable()
              .describe('Lead value'),
            expectedCloseDate: z
              .string()
              .optional()
              .nullable()
              .describe('Expected close date'),
            addTime: z.string().optional().describe('Creation timestamp'),
            updateTime: z.string().optional().nullable().describe('Last update timestamp'),
            sourceName: z.string().optional().nullable().describe('Lead source name')
          })
        )
        .describe('List of leads'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.leadId) {
      let result = await client.getLead(ctx.input.leadId);
      let lead = result?.data;
      return {
        output: {
          leads: lead
            ? [
                {
                  leadId: lead.id,
                  title: lead.title,
                  personId: lead.person_id,
                  organizationId: lead.organization_id,
                  isArchived: lead.is_archived,
                  labelIds: lead.label_ids,
                  value: lead.value,
                  expectedCloseDate: lead.expected_close_date,
                  addTime: lead.add_time,
                  updateTime: lead.update_time,
                  sourceName: lead.source_name
                }
              ]
            : []
        },
        message: lead ? `Found lead **"${lead.title}"**.` : 'Lead not found.'
      };
    }

    let result = await client.getLeads({
      start: ctx.input.start,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      archivedStatus: ctx.input.archivedStatus
    });

    let leads = (result?.data || []).map((lead: any) => ({
      leadId: lead.id,
      title: lead.title,
      personId: lead.person_id,
      organizationId: lead.organization_id,
      isArchived: lead.is_archived,
      labelIds: lead.label_ids,
      value: lead.value,
      expectedCloseDate: lead.expected_close_date,
      addTime: lead.add_time,
      updateTime: lead.update_time,
      sourceName: lead.source_name
    }));

    return {
      output: {
        leads,
        hasMore: result?.additional_data?.pagination?.more_items_in_collection ?? false
      },
      message: `Found **${leads.length}** lead(s).`
    };
  });
