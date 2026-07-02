import { SlateTool } from 'slates';
import { z } from 'zod';
import { IterableClient } from '../lib/client';
import { requireUserIdentity } from '../lib/validation';
import { spec } from '../spec';

export let trackEvent = SlateTool.create(spec, {
  name: 'Track Event',
  key: 'track_event',
  description: `Tracks a custom event for a user in Iterable. Events can trigger journeys, campaigns, and can be used for segmentation. Optionally attribute the event to a specific campaign or template.`,
  constraints: ['An Iterable project can have up to 8,000 unique custom event field names.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Email of the user the event is associated with'),
      userId: z.string().optional().describe('User ID the event is associated with'),
      eventName: z.string().describe('Name of the custom event'),
      createdAt: z
        .number()
        .optional()
        .describe(
          'Unix timestamp (seconds) of when the event occurred. Defaults to current time.'
        ),
      campaignId: z.number().optional().describe('Campaign ID to attribute this event to'),
      templateId: z.number().optional().describe('Template ID to attribute this event to'),
      createNewFields: z
        .boolean()
        .optional()
        .describe('If true, creates new event fields that do not already exist'),
      eventFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom data fields for the event')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the event was tracked successfully'),
      message: z.string().describe('Response message')
    })
  )
  .handleInvocation(async ctx => {
    requireUserIdentity(ctx.input);

    let client = new IterableClient({
      token: ctx.auth.token,
      dataCenter: ctx.config.dataCenter
    });

    let result = await client.trackEvent({
      email: ctx.input.email,
      userId: ctx.input.userId,
      eventName: ctx.input.eventName,
      createdAt: ctx.input.createdAt,
      dataFields: ctx.input.eventFields,
      campaignId: ctx.input.campaignId,
      templateId: ctx.input.templateId,
      createNewFields: ctx.input.createNewFields
    });

    return {
      output: {
        success: result.code === 'Success',
        message: result.msg || 'Event tracked successfully'
      },
      message: `Tracked event **${ctx.input.eventName}** for user **${ctx.input.email || ctx.input.userId}**.`
    };
  })
  .build();
