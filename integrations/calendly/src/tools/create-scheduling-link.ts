import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createSchedulingLink = SlateTool.create(spec, {
  name: 'Create Scheduling Link',
  key: 'create_scheduling_link',
  description: `Create a single-use scheduling link for a specific event type. The generated link can be shared with an invitee to book one meeting. Single-use links expire after 90 days if unused.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      eventTypeUri: z
        .string()
        .describe('URI of the event type to create a scheduling link for'),
      maxEventCount: z
        .number()
        .optional()
        .describe(
          'Maximum number of events that can be scheduled using this link (default: 1)'
        )
    })
  )
  .output(
    z.object({
      bookingUrl: z.string().describe('The single-use booking URL to share with invitees'),
      owner: z.string().describe('URI of the event type owner'),
      ownerType: z.string().describe('Type of owner (e.g., EventType)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createSchedulingLink({
      ownerUri: ctx.input.eventTypeUri,
      ownerType: 'EventType',
      maxEventCount: ctx.input.maxEventCount
    });

    return {
      output: {
        bookingUrl: result.bookingUrl,
        owner: result.owner,
        ownerType: result.ownerType
      },
      message: `Created scheduling link: ${result.bookingUrl}`
    };
  })
  .build();
