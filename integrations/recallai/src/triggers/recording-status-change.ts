import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let recordingStatusChangeTrigger = SlateTrigger.create(spec, {
  name: 'Recording Status Change',
  key: 'recording_status_change',
  description:
    "Triggers when a recording's status changes (processing, done, failed, or deleted)."
})
  .input(
    z.object({
      eventType: z.string().describe('Type of recording event'),
      eventId: z.string().describe('Unique event identifier'),
      recordingId: z.string().describe('Recording ID'),
      botId: z.string().describe('Bot ID associated with the recording'),
      status: z.string().describe('New recording status'),
      mediaUrl: z.string().nullable().describe('URL to access the recording media')
    })
  )
  .output(
    z.object({
      recordingId: z.string().describe('Recording unique identifier'),
      botId: z.string().describe('Bot ID associated with the recording'),
      status: z.string().describe('Recording status (processing, done, failed, deleted)'),
      mediaUrl: z
        .string()
        .nullable()
        .describe('Pre-signed URL for the recording media, if available')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let eventData = (data.data || data.event || data) as Record<string, unknown>;
      let recordingData = (eventData.recording || eventData) as Record<string, unknown>;

      let recordingId = String(recordingData.id || data.recording_id || '');
      let status = String(recordingData.status || eventData.status || data.status || '');
      let eventType = String(data.event || data.type || `recording.${status}`);
      let botId = String(recordingData.bot_id || eventData.bot_id || data.bot_id || '');

      return {
        inputs: [
          {
            eventType,
            eventId: `${recordingId}-${status}-${Date.now()}`,
            recordingId,
            botId,
            status,
            mediaUrl: recordingData.url
              ? String(recordingData.url)
              : recordingData.media_url
                ? String(recordingData.media_url)
                : null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `recording.${ctx.input.status}`,
        id: ctx.input.eventId,
        output: {
          recordingId: ctx.input.recordingId,
          botId: ctx.input.botId,
          status: ctx.input.status,
          mediaUrl: ctx.input.mediaUrl
        }
      };
    }
  })
  .build();
