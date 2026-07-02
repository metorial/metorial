import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { spec } from '../spec';

export let transcriptionCompleted = SlateTrigger.create(spec, {
  name: 'Transcription Completed',
  key: 'transcription_completed',
  description:
    'Triggers when a meeting has been processed and the transcript is ready. Configure the webhook URL in the Fireflies Developer Settings. The webhook payload is enriched with full transcript details including title, summary, attendees, and URLs.'
})
  .input(
    z.object({
      meetingId: z.string().describe('The meeting/transcript ID'),
      eventType: z.string().describe('The event type from the webhook'),
      clientReferenceId: z
        .string()
        .nullable()
        .optional()
        .describe('Custom reference ID if set during upload')
    })
  )
  .output(
    z.object({
      transcriptId: z.string().describe('Unique transcript identifier'),
      title: z.string().nullable().describe('Meeting title'),
      date: z.string().nullable().describe('Meeting date'),
      duration: z.number().nullable().describe('Meeting duration in seconds'),
      organizerEmail: z.string().nullable().describe('Organizer email'),
      participants: z.array(z.string()).nullable().describe('List of participant emails'),
      privacy: z.string().nullable().describe('Privacy level'),
      transcriptUrl: z.string().nullable().describe('URL to view the transcript'),
      audioUrl: z.string().nullable().describe('URL to the audio recording'),
      videoUrl: z.string().nullable().describe('URL to the video recording'),
      clientReferenceId: z
        .string()
        .nullable()
        .describe('Custom reference ID if set during upload'),
      summary: z
        .object({
          keywords: z.array(z.string()).nullable().describe('Key topics mentioned'),
          actionItems: z.array(z.string()).nullable().describe('Identified action items'),
          overview: z.string().nullable().describe('Meeting overview'),
          shortSummary: z.string().nullable().describe('Short summary')
        })
        .nullable()
        .describe('AI-generated meeting summary')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let meetingId = data.meetingId || data.meeting_id || data.transcriptId || '';
      let eventType =
        data.eventType || data.event_type || data.event || 'Transcription completed';
      let clientReferenceId = data.clientReferenceId || data.client_reference_id || null;

      return {
        inputs: [
          {
            meetingId: String(meetingId),
            eventType: String(eventType),
            clientReferenceId: clientReferenceId ? String(clientReferenceId) : null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new FirefliesClient({ token: ctx.auth.token });

      let transcript: any = null;
      try {
        transcript = await client.getTranscript(ctx.input.meetingId);
      } catch (_e) {
        ctx.warn('Could not fetch transcript details');
      }

      let output = {
        transcriptId: ctx.input.meetingId,
        title: transcript?.title ?? null,
        date: transcript?.date ? String(transcript.date) : null,
        duration: transcript?.duration ?? null,
        organizerEmail: transcript?.organizer_email ?? null,
        participants: transcript?.participants ?? null,
        privacy: transcript?.privacy ?? null,
        transcriptUrl: transcript?.transcript_url ?? null,
        audioUrl: transcript?.audio_url ?? null,
        videoUrl: transcript?.video_url ?? null,
        clientReferenceId: ctx.input.clientReferenceId ?? null,
        summary: transcript?.summary
          ? {
              keywords: transcript.summary.keywords ?? null,
              actionItems: transcript.summary.action_items ?? null,
              overview: transcript.summary.overview ?? null,
              shortSummary: transcript.summary.short_summary ?? null
            }
          : null
      };

      return {
        type: 'transcript.completed',
        id: ctx.input.meetingId,
        output
      };
    }
  })
  .build();
