import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLead = SlateTool.create(spec, {
  name: 'Get Lead',
  key: 'get_lead',
  description: `Retrieve detailed information about a specific lead (prospect) by their ID. Returns contact data, engagement metrics, and current status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      leadId: z.string().describe('ID of the lead to retrieve (e.g. l_1abc)')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('Unique identifier for the lead'),
      ownerId: z.string().optional().describe('ID of the user who owns this lead'),
      creatorId: z
        .string()
        .optional()
        .nullable()
        .describe('ID of the user who created this lead'),
      status: z.string().optional().nullable().describe('Current status of the lead'),
      bounced: z
        .boolean()
        .optional()
        .nullable()
        .describe('Whether emails to this lead have bounced'),
      optedOut: z.boolean().optional().nullable().describe('Whether the lead has opted out'),
      sentCount: z
        .number()
        .optional()
        .nullable()
        .describe('Number of emails sent to this lead'),
      repliedCount: z
        .number()
        .optional()
        .nullable()
        .describe('Number of replies from this lead'),
      lastSentAt: z
        .string()
        .optional()
        .nullable()
        .describe('Timestamp of the last email sent'),
      email: z.string().optional().nullable().describe('Email address'),
      firstName: z.string().optional().nullable().describe('First name'),
      lastName: z.string().optional().nullable().describe('Last name'),
      companyName: z.string().optional().nullable().describe('Company name'),
      title: z.string().optional().nullable().describe('Job title'),
      phone: z.string().optional().nullable().describe('Phone number'),
      industry: z.string().optional().nullable().describe('Industry'),
      city: z.string().optional().nullable().describe('City'),
      state: z.string().optional().nullable().describe('State'),
      linkedin: z.string().optional().nullable().describe('LinkedIn profile URL'),
      twitter: z.string().optional().nullable().describe('Twitter handle')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getLead(ctx.input.leadId);

    let lead = result.leads?.[0] || result;

    return {
      output: {
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
        industry: lead.data?.industry,
        city: lead.data?.city,
        state: lead.data?.state,
        linkedin: lead.data?.linkedin,
        twitter: lead.data?.twitter
      },
      message: `Retrieved lead **${lead.data?.first_name || ''} ${lead.data?.last_name || ''}** (${lead.data?.email || lead.id}).`
    };
  })
  .build();
