import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLeads = SlateTool.create(spec, {
  name: 'List Leads',
  key: 'list_leads',
  description: `List leads in a campaign or lead list. Supports filtering by interest status and cursor-based pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().optional().describe('Filter leads by campaign ID.'),
      listId: z.string().optional().describe('Filter leads by lead list ID.'),
      interestStatus: z.number().optional().describe('Filter by interest status value.'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of leads to return (1-100).'),
      startingAfter: z
        .string()
        .optional()
        .describe('Cursor for pagination from a previous response.')
    })
  )
  .output(
    z.object({
      leads: z
        .array(
          z.object({
            leadId: z.string().describe('Lead ID'),
            email: z.string().optional().describe('Lead email address'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            companyName: z.string().optional().describe('Company name'),
            phone: z.string().optional().describe('Phone number'),
            website: z.string().optional().describe('Website URL'),
            interestStatus: z.number().optional().describe('Interest status value'),
            emailOpenCount: z.number().optional().describe('Number of email opens'),
            emailReplyCount: z.number().optional().describe('Number of email replies'),
            emailClickCount: z.number().optional().describe('Number of link clicks'),
            verificationStatus: z.string().optional().describe('Email verification status'),
            customVariables: z
              .any()
              .optional()
              .describe('Custom variables assigned to the lead'),
            timestampCreated: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of leads'),
      nextStartingAfter: z
        .string()
        .nullable()
        .describe('Cursor for the next page, or null if no more pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listLeads({
      campaignId: ctx.input.campaignId,
      listId: ctx.input.listId,
      interestStatus: ctx.input.interestStatus,
      limit: ctx.input.limit,
      startingAfter: ctx.input.startingAfter
    });

    let leads = result.items.map((l: any) => ({
      leadId: l.id,
      email: l.email,
      firstName: l.first_name,
      lastName: l.last_name,
      companyName: l.company_name,
      phone: l.phone,
      website: l.website,
      interestStatus: l.lt_interest_status,
      emailOpenCount: l.email_open_count,
      emailReplyCount: l.email_reply_count,
      emailClickCount: l.email_click_count,
      verificationStatus: l.verification_status,
      customVariables: l.payload,
      timestampCreated: l.timestamp_created
    }));

    return {
      output: {
        leads,
        nextStartingAfter: result.next_starting_after
      },
      message: `Found **${leads.length}** lead(s).${result.next_starting_after ? ' More pages available.' : ''}`
    };
  })
  .build();
