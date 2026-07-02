import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scheduleBotForEventTool = SlateTool.create(spec, {
  name: 'Schedule Bot for Calendar Event',
  key: 'schedule_bot_for_event',
  description: `Schedule a bot to join a meeting associated with a calendar event. The bot will automatically join at the event's start time. Optionally provide bot configuration to customize the bot's name, recording settings, and other options.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      eventId: z.string().describe('Calendar event ID to schedule the bot for'),
      botConfig: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Optional bot configuration (bot_name, recording_config, etc.)')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Calendar event ID'),
      scheduled: z.boolean().describe('Whether the bot was successfully scheduled'),
      response: z
        .record(z.string(), z.unknown())
        .describe('API response with bot scheduling details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let response = await client.scheduleBotForCalendarEvent(ctx.input.eventId, {
      botConfig: ctx.input.botConfig
    });

    return {
      output: {
        eventId: ctx.input.eventId,
        scheduled: true,
        response
      },
      message: `Bot scheduled for calendar event ${ctx.input.eventId}.`
    };
  })
  .build();
