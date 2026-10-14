import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let leadSchema = z.object({
  leadId: z.string().describe('Unique identifier for the lead'),
  ownerId: z.string().optional().nullable().describe('ID of the user who owns this lead'),
  creatorId: z.string().optional().nullable().describe('ID of the user who created this lead'),
  status: z
    .string()
    .optional()
    .nullable()
    .describe('Current status of the lead (e.g. replied)'),
  bounced: z
    .boolean()
    .optional()
    .nullable()
    .describe('Whether emails to this lead have bounced'),
  optedOut: z.boolean().optional().nullable().describe('Whether the lead has opted out'),
  sentCount: z.number().optional().nullable().describe('Number of emails sent to this lead'),
  repliedCount: z.number().optional().nullable().describe('Number of replies from this lead'),
  lastSentAt: z.string().optional().nullable().describe('Timestamp of the last email sent'),
  email: z.string().optional().nullable().describe('Email address of the lead'),
  firstName: z.string().optional().nullable().describe('First name of the lead'),
  lastName: z.string().optional().nullable().describe('Last name of the lead'),
  companyName: z.string().optional().nullable().describe('Company name of the lead'),
  title: z.string().optional().nullable().describe('Job title of the lead'),
  phone: z.string().optional().nullable().describe('Phone number of the lead'),
  industry: z.string().optional().nullable().describe('Industry of the lead')
});

export let listLeads = SlateTool.create(spec, {
  name: 'List Leads',
  key: 'list_leads',
  description: `List leads (prospects) in your PersistIQ account. Returns lead contact information, engagement metrics, and status. Supports pagination to retrieve large lead lists.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z
        .number()
        .min(0)
        .refine(Number.isSafeInteger, 'Page must be a safe whole number')
        .optional()
        .describe('Page number for pagination'),
      email: z.string().optional().describe('Filter by lead email address'),
      status: z.string().optional().describe('Filter by status name from list_lead_statuses'),
      statusId: z.string().optional().describe('Filter by status ID from list_lead_statuses'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter leads updated after this ISO 8601 timestamp'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter leads created after this ISO 8601 timestamp')
    })
  )
  .output(
    z.object({
      leads: z.array(leadSchema).describe('List of leads'),
      hasMore: z.boolean().describe('Whether there are more pages of results'),
      nextPage: z
        .string()
        .optional()
        .nullable()
        .describe('Provider continuation value for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listLeads(ctx.input);

    let leads = (result.leads || []).map(lead => ({
      leadId: lead.id,
      ownerId: lead.owner_id,
      creatorId: lead.creator_id,
      status: lead.status,
      bounced: lead.bounced,
      optedOut: lead.optedout,
      sentCount: lead.sent_count,
      repliedCount: lead.replied_count,
      lastSentAt: lead.last_sent_at,
      email: lead.data?.email,
      firstName: lead.data?.first_name,
      lastName: lead.data?.last_name,
      companyName: lead.data?.company_name,
      title: lead.data?.title,
      phone: lead.data?.phone,
      industry: lead.data?.industry
    }));

    let hasMore = result.has_more ?? !!result.next_page;

    return {
      output: { leads, hasMore, nextPage: result.next_page },
      message: `Retrieved **${leads.length}** leads${hasMore ? ' (more pages available)' : ''}.`
    };
  })
  .build();
