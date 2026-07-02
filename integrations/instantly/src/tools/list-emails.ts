import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEmails = SlateTool.create(spec, {
  name: 'List Emails',
  key: 'list_emails',
  description: `List sent and received emails from the unified inbox. Filter by campaign, lead, sending account, read/unread status, or search by email address or thread ID.`,
  constraints: ['Rate limited to 20 requests per minute.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of emails to return (1-100).'),
      startingAfter: z
        .string()
        .optional()
        .describe('Cursor for pagination from a previous response.'),
      campaignId: z.string().optional().describe('Filter by campaign ID.'),
      listId: z.string().optional().describe('Filter by lead list ID.'),
      sendingAccount: z
        .string()
        .optional()
        .describe('Filter by sending account email (comma-separated for multiple).'),
      leadEmail: z.string().optional().describe('Filter by lead email address.'),
      search: z
        .string()
        .optional()
        .describe('Search by email address or "thread:THREAD_ID" for thread search.'),
      isUnread: z.boolean().optional().describe('Filter for unread emails only.')
    })
  )
  .output(
    z.object({
      emails: z
        .array(
          z.object({
            emailId: z.string().describe('Email ID'),
            subject: z.string().optional().describe('Email subject'),
            fromAddress: z.string().optional().describe('Sender email address'),
            toAddresses: z.array(z.string()).optional().describe('Recipient email addresses'),
            body: z.any().optional().describe('Email body (text and/or html)'),
            campaignId: z.string().optional().describe('Associated campaign ID'),
            leadEmail: z.string().optional().describe('Associated lead email'),
            sendingAccount: z.string().optional().describe('Sending account email'),
            threadId: z.string().optional().describe('Thread ID'),
            isUnread: z.boolean().optional().describe('Whether the email is unread'),
            isAutoReply: z.boolean().optional().describe('Whether this is an auto-reply'),
            step: z.number().optional().describe('Campaign step number'),
            timestampEmail: z.string().optional().describe('Email timestamp from mail server'),
            timestampCreated: z.string().optional().describe('Database creation timestamp')
          })
        )
        .describe('List of emails'),
      nextStartingAfter: z.string().nullable().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listEmails({
      limit: ctx.input.limit,
      startingAfter: ctx.input.startingAfter,
      campaignId: ctx.input.campaignId,
      listId: ctx.input.listId,
      eaccount: ctx.input.sendingAccount,
      lead: ctx.input.leadEmail,
      search: ctx.input.search,
      isUnread: ctx.input.isUnread
    });

    let emails = result.items.map((e: any) => ({
      emailId: e.id,
      subject: e.subject,
      fromAddress: e.from_address_email,
      toAddresses: e.to_address_email_list,
      body: e.body,
      campaignId: e.campaign_id,
      leadEmail: e.lead,
      sendingAccount: e.eaccount,
      threadId: e.thread_id,
      isUnread: e.is_unread,
      isAutoReply: e.is_auto_reply === 1,
      step: e.step,
      timestampEmail: e.timestamp_email,
      timestampCreated: e.timestamp_created
    }));

    return {
      output: {
        emails,
        nextStartingAfter: result.next_starting_after
      },
      message: `Found **${emails.length}** email(s).${result.next_starting_after ? ' More pages available.' : ''}`
    };
  })
  .build();
