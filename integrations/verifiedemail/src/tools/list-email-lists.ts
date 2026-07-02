import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEmailLists = SlateTool.create(spec, {
  name: 'List Email Lists',
  key: 'list_email_lists',
  description: `Retrieve all email lists in your VerifiedEmail account. Returns each list with its name, email count, verification progress, and current status.

Use this to browse existing lists before starting a verification job or fetching results.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      limit: z.number().optional().describe('Number of lists per page (default: 20)')
    })
  )
  .output(
    z.object({
      lists: z
        .array(
          z.object({
            listId: z.string().describe('Unique identifier of the list'),
            name: z.string().describe('Name of the email list'),
            emailCount: z.number().describe('Total number of email addresses in the list'),
            verifiedCount: z.number().describe('Number of verified email addresses'),
            unverifiedCount: z.number().describe('Number of unverified email addresses'),
            status: z
              .string()
              .describe('Current status of the list (e.g. ready, verifying, completed)'),
            createdAt: z.string().describe('When the list was created'),
            updatedAt: z.string().describe('When the list was last updated')
          })
        )
        .describe('Array of email lists'),
      total: z.number().describe('Total number of lists available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getLists({
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    return {
      output: result,
      message: `Found **${result.total}** email list(s). Returned **${result.lists.length}** list(s) on this page.`
    };
  })
  .build();
