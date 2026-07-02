import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { intercomServiceError } from '../lib/errors';
import { objectOrUndefined, stringOrUndefined } from '../lib/output';
import { spec } from '../spec';

export let manageEvents = SlateTool.create(spec, {
  name: 'Manage Data Events',
  key: 'manage_events',
  description: `Submit or list custom data events for contacts. Data events track user activity and can trigger automations or be used for segmentation.
Use "submit" to track a new event, or "list" to retrieve events for a contact.`,
  instructions: [
    'For "submit", provide an eventName and identify the contact by userId, email, or intercomUserId.',
    'For "list", identify the contact by intercomUserId, email, or userId. Set summary to true for aggregated counts.',
    'Metadata values support strings, numbers, booleans, and links (prefix with "http" or use rich_link format).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['submit', 'list'])
        .describe('Whether to submit a new event or list existing events'),
      eventName: z.string().optional().describe('Event name (required for submit)'),
      userId: z.string().optional().describe('External user ID'),
      email: z.string().optional().describe('Contact email'),
      intercomUserId: z.string().optional().describe('Intercom user ID'),
      createdAt: z
        .number()
        .optional()
        .describe('Unix timestamp for the event (for submit, defaults to now)'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Event metadata as key-value pairs (for submit)'),
      perPage: z.number().optional().describe('Results per page (for list)'),
      summary: z
        .boolean()
        .optional()
        .describe('Return summarized/aggregated event data (for list)')
    })
  )
  .output(
    z.object({
      submitted: z.boolean().optional().describe('Whether event was submitted successfully'),
      events: z
        .array(
          z.object({
            eventName: z.string().describe('Event name'),
            intercomUserId: z.string().optional().describe('Intercom user ID'),
            createdAt: z.number().optional().describe('Event timestamp'),
            metadata: z.record(z.string(), z.any()).optional().describe('Event metadata')
          })
        )
        .optional()
        .describe('List of events (for list action)'),
      totalCount: z.number().optional().describe('Total number of events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let { action } = ctx.input;

    if (action === 'submit') {
      if (!ctx.input.eventName) throw intercomServiceError('eventName is required for submit');
      if (!ctx.input.userId && !ctx.input.email && !ctx.input.intercomUserId) {
        throw intercomServiceError(
          'At least one of userId, email, or intercomUserId is required'
        );
      }
      await client.submitEvent({
        eventName: ctx.input.eventName,
        userId: ctx.input.userId,
        email: ctx.input.email,
        intercomUserId: ctx.input.intercomUserId,
        createdAt: ctx.input.createdAt,
        metadata: ctx.input.metadata
      });
      return {
        output: { submitted: true },
        message: `Submitted event **${ctx.input.eventName}**`
      };
    }

    if (action === 'list') {
      if (!ctx.input.intercomUserId && !ctx.input.email && !ctx.input.userId) {
        throw intercomServiceError(
          'At least one of intercomUserId, email, or userId is required for list'
        );
      }
      let result = await client.listEvents({
        type: 'user',
        intercomUserId: ctx.input.intercomUserId,
        email: ctx.input.email,
        userId: ctx.input.userId,
        perPage: ctx.input.perPage,
        summary: ctx.input.summary
      });
      let events = (result.events || []).map((e: any) => ({
        eventName: String(e.event_name),
        intercomUserId: stringOrUndefined(e.intercom_user_id),
        createdAt: e.created_at,
        metadata: objectOrUndefined(e.metadata)
      }));
      return {
        output: { events, totalCount: result.total_count },
        message: `Found **${events.length}** events`
      };
    }

    throw intercomServiceError(`Unknown action: ${action}`);
  })
  .build();
