import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let transcriptReady = SlateTrigger.create(spec, {
  name: 'Transcript Ready',
  key: 'transcript_ready',
  description:
    'Fires when a meeting transcript has been generated and is available. Provides the full transcript data with speaker segments, timestamps, and text content.'
})
  .input(
    z.object({
      webhookId: z.string().describe('Unique webhook event identifier.'),
      event: z.string().describe('Event type (TranscriptReady).'),
      executedAt: z.string().describe('ISO 8601 timestamp of when the event fired.'),
      meetingId: z.string().describe('Meeting identifier.'),
      transcriptId: z.string().describe('Transcript identifier.'),
      segments: z
        .array(
          z.object({
            speaker: z.string().describe('Speaker name.'),
            text: z.string().describe('Transcribed text.'),
            startTime: z.number().describe('Start time in seconds.'),
            endTime: z.number().describe('End time in seconds.')
          })
        )
        .describe('Transcript segments.')
    })
  )
  .output(
    z.object({
      meetingId: z.string().describe('Meeting identifier the transcript belongs to.'),
      transcriptId: z.string().describe('Unique transcript identifier.'),
      segments: z
        .array(
          z.object({
            speaker: z.string().describe('Speaker name.'),
            text: z.string().describe('Transcribed text content.'),
            startTime: z.number().describe('Start time of the segment in seconds.'),
            endTime: z.number().describe('End time of the segment in seconds.')
          })
        )
        .describe('Full transcript segments with speaker attribution.'),
      executedAt: z.string().describe('ISO 8601 timestamp of when the event was triggered.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data || data.event !== 'TranscriptReady') {
        return { inputs: [] };
      }

      let transcript = data.data ?? {};

      return {
        inputs: [
          {
            webhookId: data.id ?? '',
            event: data.event,
            executedAt: data.executedAt ?? '',
            meetingId: transcript.meetingId ?? '',
            transcriptId: transcript.id ?? '',
            segments: (transcript.data ?? []).map((s: any) => ({
              speaker: s.speaker ?? '',
              text: s.text ?? '',
              startTime: s.startTime ?? 0,
              endTime: s.endTime ?? 0
            }))
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'transcript.ready',
        id: ctx.input.webhookId,
        output: {
          meetingId: ctx.input.meetingId,
          transcriptId: ctx.input.transcriptId,
          segments: ctx.input.segments,
          executedAt: ctx.input.executedAt
        }
      };
    }
  })
  .build();
