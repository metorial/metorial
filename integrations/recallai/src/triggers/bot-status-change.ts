import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let statusChangeSchema = z.object({
  code: z.string().describe('Status code'),
  message: z.string().nullable().describe('Status message'),
  createdAt: z.string().describe('Timestamp of status change'),
  subCode: z.string().nullable().describe('Sub-code for additional context')
});

export let botStatusChangeTrigger = SlateTrigger.create(spec, {
  name: 'Bot Status Change',
  key: 'bot_status_change',
  description:
    "Triggers when a bot's status changes (e.g. joining call, in waiting room, recording, call ended, done, fatal error)."
})
  .input(
    z.object({
      eventType: z.string().describe('Type of status change event'),
      eventId: z.string().describe('Unique event identifier'),
      botId: z.string().describe('Bot ID'),
      botName: z.string().describe('Bot display name'),
      status: z.string().describe('New bot status'),
      statusChanges: z.array(statusChangeSchema).describe('Full status history'),
      meetingUrl: z.unknown().describe('Meeting URL'),
      meetingMetadata: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe('Meeting metadata')
    })
  )
  .output(
    z.object({
      botId: z.string().describe('Bot unique identifier'),
      botName: z.string().describe('Bot display name'),
      status: z.string().describe('New bot status'),
      statusChanges: z.array(statusChangeSchema).describe('Full history of status changes'),
      meetingUrl: z.unknown().describe('Meeting URL'),
      meetingMetadata: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe('Meeting metadata')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let eventData = (data.data || data.event || data) as Record<string, unknown>;
      let botData = (eventData.bot || eventData) as Record<string, unknown>;

      let statusChanges = Array.isArray(botData.status_changes)
        ? botData.status_changes.map((sc: Record<string, unknown>) => ({
            code: String(sc.code || ''),
            message: sc.message ? String(sc.message) : null,
            createdAt: String(sc.created_at || ''),
            subCode: sc.sub_code ? String(sc.sub_code) : null
          }))
        : [];

      let botId = String(botData.id || data.bot_id || '');
      let status = String(botData.status || eventData.status || data.status || '');
      let eventType = String(data.event || data.type || `bot.${status}`);

      return {
        inputs: [
          {
            eventType,
            eventId: `${botId}-${status}-${Date.now()}`,
            botId,
            botName: String(botData.bot_name || ''),
            status,
            statusChanges,
            meetingUrl: botData.meeting_url || null,
            meetingMetadata: (botData.meeting_metadata as Record<string, unknown>) || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `bot.${ctx.input.status}`,
        id: ctx.input.eventId,
        output: {
          botId: ctx.input.botId,
          botName: ctx.input.botName,
          status: ctx.input.status,
          statusChanges: ctx.input.statusChanges,
          meetingUrl: ctx.input.meetingUrl,
          meetingMetadata: ctx.input.meetingMetadata
        }
      };
    }
  })
  .build();
