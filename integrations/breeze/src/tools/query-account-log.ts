import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let queryAccountLog = SlateTool.create(spec, {
  name: 'Query Account Log',
  key: 'query_account_log',
  description: `Query the account activity log to find historical records of actions performed in the Breeze account. Filter by action type, date range, and user. Useful for auditing changes across people, contributions, events, tags, forms, volunteers, and more.`,
  instructions: [
    'The "action" parameter is required. Common action types include: person_created, person_updated, person_deleted, contribution_added, contribution_updated, event_created, event_updated, tag_created, tag_assigned, tag_unassigned, form_entry_updated, volunteer_role_created, user_created, and more.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .string()
        .describe(
          'Action type to query (e.g., "person_created", "contribution_added", "event_updated")'
        ),
      start: z.string().optional().describe('Start date filter (YYYY-MM-DD format)'),
      end: z.string().optional().describe('End date filter (YYYY-MM-DD format)'),
      userId: z.string().optional().describe('Filter by the user who performed the action'),
      details: z
        .boolean()
        .optional()
        .describe('Include descriptive details about each logged action'),
      limit: z.number().optional().describe('Maximum number of log entries to return')
    })
  )
  .output(
    z.object({
      logEntries: z.array(z.any()).describe('Array of account log entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let entries = await client.listAccountLog({
      action: ctx.input.action,
      start: ctx.input.start,
      end: ctx.input.end,
      userId: ctx.input.userId,
      details: ctx.input.details,
      limit: ctx.input.limit
    });
    let entriesArray = Array.isArray(entries) ? entries : [];

    return {
      output: { logEntries: entriesArray },
      message: `Found **${entriesArray.length}** log entries for action "${ctx.input.action}".`
    };
  })
  .build();
