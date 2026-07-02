import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchEmails = SlateTool.create(spec, {
  name: 'Search Sent Emails',
  key: 'search_emails',
  description: `Search and retrieve sent emails and their delivery records. Filter by date range, email ID, sender/recipient keywords, and status. Supports pagination with continuation tokens.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().optional().describe('Start date in ISO-8601 format'),
      endDate: z.string().optional().describe('End date in ISO-8601 format'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default 5000)'),
      continueToken: z
        .string()
        .optional()
        .describe('Continuation token for paginated results'),
      emailIds: z.array(z.string()).optional().describe('Filter by specific email IDs'),
      filterQuery: z
        .string()
        .optional()
        .describe('Search query supporting boolean operators (AND, OR, NOT)'),
      username: z.string().optional().describe('Filter by SMTP username or API key'),
      openedOnly: z.boolean().optional().describe('Only return emails that were opened'),
      clickedOnly: z.boolean().optional().describe('Only return emails that had clicks'),
      sortBy: z.enum(['email_ts', 'delivered_at']).optional().describe('Sort field'),
      sortDir: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of matching emails'),
      continueToken: z.string().optional().describe('Token for fetching next page of results'),
      emails: z
        .array(
          z.object({
            emailId: z.string().describe('Unique email identifier'),
            subject: z.string().describe('Email subject'),
            sender: z.string().describe('Sender email address'),
            recipient: z.string().describe('Recipient email address'),
            status: z.string().describe('Delivery status'),
            emailTimestamp: z.string().describe('When the email was sent'),
            deliveredAt: z.string().optional().describe('When the email was delivered'),
            totalOpens: z.number().optional().describe('Number of times email was opened'),
            totalClicks: z.number().optional().describe('Number of link clicks')
          })
        )
        .describe('Matching emails')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.searchEmails({
      ...ctx.input,
      emailId: ctx.input.emailIds
    });
    let data = result.data || result;

    let emails = (data.emails || []).map((e: any) => ({
      emailId: e.email_id ?? '',
      subject: e.subject ?? '',
      sender: e.sender ?? '',
      recipient: e.recipient ?? '',
      status: e.status ?? '',
      emailTimestamp: e.email_ts ?? '',
      deliveredAt: e.delivered_at,
      totalOpens: e.total_opens,
      totalClicks: e.total_clicks
    }));

    return {
      output: {
        count: data.count ?? emails.length,
        continueToken: data.continue_token,
        emails
      },
      message: `Found **${data.count ?? emails.length}** sent emails.`
    };
  })
  .build();
