import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSentEmails = SlateTool.create(spec, {
  name: 'List Sent Emails',
  key: 'list_sent_emails',
  description: `Retrieve a paginated list of sent newsletter emails. Returns subjects and send dates. Use offset and limit for pagination.`,
  constraints: ['Default offset is 0 and default limit is 10.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Pagination offset (default: 0)'),
      limit: z.number().optional().describe('Number of emails to return (default: 10)')
    })
  )
  .output(
    z.object({
      emails: z
        .array(
          z.object({
            newsletterEmailId: z.string().describe('Unique identifier of the sent email'),
            subject: z.string().describe('Subject line of the email'),
            sentAt: z.string().describe('Date and time the email was sent')
          })
        )
        .describe('List of sent newsletter emails'),
      total: z.number().describe('Total number of sent emails'),
      offset: z.number().describe('Current pagination offset'),
      limit: z.number().describe('Current pagination limit')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listSentEmails({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    return {
      output: {
        emails: result.emails,
        total: result.meta.total,
        offset: result.meta.offset,
        limit: result.meta.limit
      },
      message: `Retrieved **${result.emails.length}** sent emails (total: ${result.meta.total}).`
    };
  })
  .build();
