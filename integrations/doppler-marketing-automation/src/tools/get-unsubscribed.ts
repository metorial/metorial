import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUnsubscribed = SlateTool.create(spec, {
  name: 'Get Unsubscribed Contacts',
  key: 'get_unsubscribed',
  description: `Retrieve contacts that have been unsubscribed or removed from the account. Supports filtering by date range.
Returns the email, unsubscription date, and reason for each contact.`,
  constraints: [
    'Date filters must include timezone offset (e.g. 2024-01-01T00:00:00+00:00). URL-encode the "+" as "%2B" if needed.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      from: z
        .string()
        .optional()
        .describe(
          'Start date for filtering (ISO 8601 with timezone, e.g. 2024-01-01T00:00:00+00:00)'
        ),
      to: z.string().optional().describe('End date for filtering (ISO 8601 with timezone)'),
      page: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of items per page')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            email: z.string().describe('Contact email address'),
            unsubscriptionDate: z.string().describe('Date of unsubscription'),
            unsubscriptionType: z
              .string()
              .describe('Type/reason of unsubscription (e.g. hardBounce, manual, abuseLink)')
          })
        )
        .describe('Array of unsubscribed contacts'),
      totalCount: z
        .number()
        .describe('Total number of unsubscribed contacts matching the criteria'),
      currentPage: z.number().optional().describe('Current page number'),
      pagesCount: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.config.accountEmail
    });

    let result = await client.getUnsubscribed({
      from: ctx.input.from,
      to: ctx.input.to,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let contacts = (result.items ?? []).map(c => ({
      email: c.email,
      unsubscriptionDate: c.unsubscriptionDate,
      unsubscriptionType: c.unsubscriptionType
    }));

    return {
      output: {
        contacts,
        totalCount: result.itemsCount,
        currentPage: result.currentPage,
        pagesCount: result.pagesCount
      },
      message: `Found **${result.itemsCount}** unsubscribed contacts.`
    };
  })
  .build();
