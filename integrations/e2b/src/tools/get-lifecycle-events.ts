import { SlateTool } from 'slates';
import { z } from 'zod';
import { E2BClient } from '../lib/client';
import { spec } from '../spec';

export let getLifecycleEvents = SlateTool.create(spec, {
  name: 'Get Lifecycle Events',
  key: 'get_lifecycle_events',
  description: `Retrieve sandbox lifecycle events. Track when sandboxes are created, paused, resumed, updated, snapshotted, or killed. Can fetch events for a specific sandbox or for all sandboxes on the team.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sandboxId: z
        .string()
        .optional()
        .describe(
          'Filter events for a specific sandbox. Omit to get events for all team sandboxes.'
        ),
      offset: z.number().optional().describe('Number of events to skip (default 0).'),
      limit: z
        .number()
        .optional()
        .describe('Number of events to return (default 10, max 100).'),
      orderAsc: z
        .boolean()
        .optional()
        .describe('Sort by timestamp ascending (true) or descending (false, default).')
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            version: z.string().describe('API version of the event.'),
            eventId: z.string().describe('Unique event identifier.'),
            type: z
              .string()
              .describe(
                'Event type (e.g., sandbox.lifecycle.created, sandbox.lifecycle.killed).'
              ),
            eventData: z.any().optional().describe('Event-specific metadata.'),
            sandboxId: z.string().describe('ID of the sandbox.'),
            sandboxBuildId: z.string().describe('Build ID of the sandbox.'),
            sandboxExecutionId: z.string().describe('Execution ID of the sandbox.'),
            sandboxTeamId: z.string().describe('Team ID that owns the sandbox.'),
            sandboxTemplateId: z.string().describe('Template ID of the sandbox.'),
            timestamp: z.string().describe('ISO 8601 timestamp of the event.')
          })
        )
        .describe('List of lifecycle events.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new E2BClient({ token: ctx.auth.token });

    ctx.progress('Fetching lifecycle events...');
    let events = await client.getLifecycleEvents({
      sandboxId: ctx.input.sandboxId,
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      orderAsc: ctx.input.orderAsc
    });

    return {
      output: { events },
      message: `Retrieved **${events.length}** lifecycle event(s)${ctx.input.sandboxId ? ` for sandbox \`${ctx.input.sandboxId}\`` : ''}.`
    };
  })
  .build();
