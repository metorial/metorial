import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTransactionalEmails = SlateTool.create(spec, {
  name: 'List Transactional Emails',
  key: 'list_transactional_emails',
  description: `Retrieve all published transactional email templates in your Loops account. Returns template IDs, names, and required data variables. Useful for discovering which templates are available for sending transactional emails.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (10-50, defaults to 20)'),
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor for fetching the next page of results')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            transactionalId: z
              .string()
              .describe('Unique ID of the transactional email template'),
            name: z.string().describe('Name of the template'),
            dataVariables: z
              .array(z.string())
              .describe('List of data variable names required by the template')
          })
        )
        .describe('Published transactional email templates'),
      hasMore: z.boolean().describe('Whether more results are available'),
      nextCursor: z.string().nullable().describe('Cursor to use for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTransactionalEmails({
      perPage: ctx.input.perPage,
      cursor: ctx.input.cursor
    });

    return {
      output: {
        templates: result.emails.map(t => ({
          transactionalId: t.id,
          name: t.name,
          dataVariables: t.dataVariables
        })),
        hasMore: result.pagination.hasMore,
        nextCursor: result.pagination.cursor
      },
      message: `Found **${result.emails.length}** transactional email template(s)${result.pagination.hasMore ? ` (more available)` : ''}.`
    };
  })
  .build();
