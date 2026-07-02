import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let transcriptionCompleted = SlateTrigger.create(spec, {
  name: 'Transcription Completed',
  key: 'transcription_completed',
  description:
    'Triggers when a transcription job completes or fails. Polls for new completed/failed transcripts and returns their results.'
})
  .input(
    z.object({
      transcriptId: z.string().describe('The transcript ID.'),
      status: z.string().describe('The transcript status (completed or error).'),
      audioUrl: z.string().describe('The audio URL that was transcribed.'),
      created: z.string().describe('Creation timestamp.'),
      completed: z.string().optional().nullable().describe('Completion timestamp.'),
      error: z.string().optional().nullable().describe('Error message if failed.'),
      resourceUrl: z.string().describe('URL to retrieve the full transcript.')
    })
  )
  .output(
    z.object({
      transcriptId: z.string().describe('Unique transcript identifier.'),
      status: z.string().describe('Transcript status: completed or error.'),
      audioUrl: z.string().describe('The audio URL that was transcribed.'),
      text: z.string().optional().nullable().describe('Full transcript text (null if error).'),
      confidence: z.number().optional().nullable().describe('Overall confidence score.'),
      audioDuration: z.number().optional().nullable().describe('Audio duration in seconds.'),
      languageCode: z
        .string()
        .optional()
        .nullable()
        .describe('Detected or specified language code.'),
      error: z
        .string()
        .optional()
        .nullable()
        .describe('Error message if the transcript failed.'),
      created: z.string().describe('Creation timestamp.'),
      completed: z.string().optional().nullable().describe('Completion timestamp.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        region: ctx.config.region
      });

      let lastSeenId = ctx.input.state?.lastSeenId as string | undefined;

      let result = await client.listTranscripts({
        limit: 50,
        afterId: lastSeenId
      });

      let transcripts = result.transcripts || [];

      let finishedTranscripts = transcripts.filter(
        (t: any) => t.status === 'completed' || t.status === 'error'
      );

      let newestId = transcripts.length > 0 ? transcripts[0].id : lastSeenId;

      return {
        inputs: finishedTranscripts.map((t: any) => ({
          transcriptId: t.id,
          status: t.status,
          audioUrl: t.audio_url,
          created: t.created,
          completed: t.completed ?? null,
          error: t.error ?? null,
          resourceUrl: t.resource_url
        })),
        updatedState: {
          lastSeenId: newestId
        }
      };
    },

    handleEvent: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        region: ctx.config.region
      });

      let transcript: any = {};
      try {
        transcript = await client.getTranscript(ctx.input.transcriptId);
      } catch {
        // If fetch fails, use the polling data
      }

      return {
        type: ctx.input.status === 'completed' ? 'transcript.completed' : 'transcript.failed',
        id: ctx.input.transcriptId,
        output: {
          transcriptId: ctx.input.transcriptId,
          status: ctx.input.status,
          audioUrl: ctx.input.audioUrl,
          text: transcript.text ?? null,
          confidence: transcript.confidence ?? null,
          audioDuration: transcript.audio_duration ?? null,
          languageCode: transcript.language_code ?? null,
          error: ctx.input.error ?? transcript.error ?? null,
          created: ctx.input.created,
          completed: ctx.input.completed ?? null
        }
      };
    }
  })
  .build();
