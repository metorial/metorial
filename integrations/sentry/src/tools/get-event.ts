import { SlateTool } from 'slates';
import { z } from 'zod';
import { sentryServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getEventTool = SlateTool.create(spec, {
  name: 'Get Event',
  key: 'get_event',
  description: `Retrieve a specific error event by ID, or list events for an issue. Returns full event details including stack traces, exception data, breadcrumbs, and contextual information.`,
  instructions: [
    'To get a specific event: provide projectSlug and eventId',
    'To list events for an issue: provide issueId',
    'To get the latest event for an issue: provide issueId and set latest to true'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().optional().describe('Specific event ID to retrieve'),
      projectSlug: z
        .string()
        .optional()
        .describe('Project slug (required when getting event by ID)'),
      issueId: z
        .string()
        .optional()
        .describe('Issue ID to list events for or get latest event'),
      latest: z
        .boolean()
        .optional()
        .describe('If true and issueId provided, fetch only the latest event'),
      cursor: z.string().optional().describe('Pagination cursor for listing events')
    })
  )
  .output(
    z.object({
      event: z.any().optional().describe('Single event data with stack trace and context'),
      events: z.array(z.any()).optional().describe('List of events for an issue')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.eventId && ctx.input.projectSlug) {
      let event = await client.getEvent(ctx.input.projectSlug, ctx.input.eventId);
      return {
        output: { event },
        message: `Retrieved event **${ctx.input.eventId}**.`
      };
    }

    if (ctx.input.issueId && ctx.input.latest) {
      let event = await client.getLatestEvent(ctx.input.issueId);
      return {
        output: { event },
        message: `Retrieved latest event for issue **${ctx.input.issueId}**.`
      };
    }

    if (ctx.input.issueId) {
      let events = await client.listIssueEvents(ctx.input.issueId, {
        cursor: ctx.input.cursor
      });
      return {
        output: { events },
        message: `Found **${(events || []).length}** events for issue **${ctx.input.issueId}**.`
      };
    }

    throw sentryServiceError('Provide either eventId+projectSlug or issueId');
  })
  .build();
