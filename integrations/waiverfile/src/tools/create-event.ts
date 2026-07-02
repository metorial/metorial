import { SlateTool } from 'slates';
import { z } from 'zod';
import { WaiverFileClient } from '../lib/client';
import { spec } from '../spec';

export let createEvent = SlateTool.create(spec, {
  name: 'Create Event',
  key: 'create_event',
  description: `Create a new event (e.g. party, class, tournament) in WaiverFile. Events can have associated waiver forms, a location, max participants, signing cutoff, and manager email notifications.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      eventName: z.string().describe('Name of the event'),
      dateStart: z.string().describe('Event start date/time (UTC, ISO 8601)'),
      dateEnd: z.string().describe('Event end date/time (UTC, ISO 8601)'),
      isAllDay: z.boolean().optional().describe('Whether this is an all-day event'),
      eventCategoryId: z
        .string()
        .optional()
        .describe('Category ID to organize the event under'),
      eventLocation: z.string().optional().describe('Location of the event'),
      maxParticipants: z
        .number()
        .optional()
        .describe('Maximum number of participants allowed'),
      signingCutoff: z
        .string()
        .optional()
        .describe('Cutoff date/time for signing waivers (UTC, ISO 8601)'),
      waiverFormIdList: z
        .string()
        .optional()
        .describe('Comma-separated list of waiver form IDs to associate with this event'),
      managerEmailList: z
        .string()
        .optional()
        .describe('Comma-separated list of manager email addresses to notify'),
      managerEmailMessage: z
        .string()
        .optional()
        .describe('Custom message to include in manager notification emails')
    })
  )
  .output(
    z.object({
      event: z.any().describe('The created event record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaiverFileClient({
      token: ctx.auth.token,
      siteId: ctx.auth.siteId
    });

    let event = await client.insertEvent({
      eventName: ctx.input.eventName,
      dateStart: ctx.input.dateStart,
      dateEnd: ctx.input.dateEnd,
      isAllDay: ctx.input.isAllDay,
      eventCategoryId: ctx.input.eventCategoryId,
      eventLocation: ctx.input.eventLocation,
      maxParticipants: ctx.input.maxParticipants,
      signingCutoff: ctx.input.signingCutoff,
      waiverFormIdList: ctx.input.waiverFormIdList,
      managerEmailList: ctx.input.managerEmailList,
      managerEmailMessage: ctx.input.managerEmailMessage
    });

    return {
      output: { event },
      message: `Created event **${ctx.input.eventName}** (${ctx.input.dateStart} to ${ctx.input.dateEnd}).`
    };
  })
  .build();
