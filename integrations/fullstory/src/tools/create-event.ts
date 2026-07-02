import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEvent = SlateTool.create(spec, {
  name: 'Create Event',
  key: 'create_event',
  description: `Send a custom server-side event to FullStory. Events enrich session data with business context such as backend transactions, loyalty status changes, or support tickets. Events are associated with a user and become searchable in FullStory.`,
  instructions: [
    "Provide either a userId (FullStory ID) or uid (your app's user ID) to associate the event.",
    "Optionally attach to a specific session by providing sessionId, or set useMostRecent to true to attach to the user's most recent session.",
    'Custom properties can include strings, numbers, booleans, and dates (as ISO 8601 strings).'
  ],
  constraints: [
    'Each FullStory account has a maximum number of server events per billing cycle.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z
        .string()
        .describe('Name of the event (e.g., "Support Ticket", "Purchase Completed")'),
      userId: z
        .string()
        .optional()
        .describe('FullStory-generated user ID to associate the event with'),
      uid: z
        .string()
        .optional()
        .describe("Your application's user ID to associate the event with"),
      sessionId: z
        .string()
        .optional()
        .describe(
          'Specific session ID to attach the event to. When provided, user fields are not needed.'
        ),
      useMostRecent: z
        .boolean()
        .optional()
        .describe(
          "If true, attaches the event to the user's most recent session within 30 minutes"
        ),
      timestamp: z
        .string()
        .optional()
        .describe('Event timestamp in ISO 8601 format. Defaults to current time.'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom properties for the event (e.g., priority, amount, status)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the event was created successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.createEvent({
      name: ctx.input.name,
      userId: ctx.input.userId,
      uid: ctx.input.uid,
      sessionId: ctx.input.sessionId,
      useMostRecent: ctx.input.useMostRecent,
      timestamp: ctx.input.timestamp,
      properties: ctx.input.properties
    });

    return {
      output: {
        success: true
      },
      message: `Event **${ctx.input.name}** created successfully.`
    };
  })
  .build();
