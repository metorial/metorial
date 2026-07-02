import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let transcriptionUpdated = SlateTrigger.create(spec, {
  name: 'Transcription State Changed',
  key: 'transcription_state_changed',
  description:
    'Triggers when a transcription changes state (e.g. from transcribing to done, or to failed). Polls transcriptions in the organization and detects state transitions.'
})
  .input(
    z.object({
      transcriptionId: z.string().describe('ID of the transcription that changed state.'),
      name: z.string().describe('Name of the transcription.'),
      previousState: z.string().optional().describe('Previous state of the transcription.'),
      currentState: z.string().describe('Current state of the transcription.'),
      language: z.string().describe('Language code of the transcription.'),
      audioLengthInSeconds: z
        .number()
        .optional()
        .nullable()
        .describe('Duration of the audio in seconds.'),
      createdAt: z.string().optional().describe('Creation timestamp.')
    })
  )
  .output(
    z.object({
      transcriptionId: z.string().describe('ID of the transcription.'),
      name: z.string().describe('Name of the transcription.'),
      previousState: z.string().optional().describe('Previous state before the change.'),
      currentState: z.string().describe('Current state after the change.'),
      language: z.string().describe('Language code of the transcription.'),
      audioLengthInSeconds: z
        .number()
        .optional()
        .nullable()
        .describe('Duration of the audio in seconds.'),
      createdAt: z.string().optional().describe('Creation timestamp.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let orgId = ctx.config.organizationId;
      if (!orgId) {
        ctx.warn(
          'Organization ID is not configured. Cannot poll for transcription state changes.'
        );
        return { inputs: [], updatedState: ctx.state };
      }

      let client = new Client({ token: ctx.auth.token });

      let result = await client.listTranscriptions({ organizationId: orgId });
      let transcriptions: any[] = result.results || [];

      let previousStates: Record<string, string> =
        (ctx.state as Record<string, string> | null) || {};
      let inputs: any[] = [];
      let newStates: Record<string, string> = {};

      for (let t of transcriptions) {
        newStates[t.id] = t.state;

        let prevState = previousStates[t.id];
        if (prevState !== undefined && prevState !== t.state) {
          inputs.push({
            transcriptionId: t.id,
            name: t.name,
            previousState: prevState,
            currentState: t.state,
            language: t.language,
            audioLengthInSeconds: t.audioLengthInSeconds,
            createdAt: t.created_at
          });
        }
      }

      return {
        inputs,
        updatedState: newStates
      };
    },

    handleEvent: async ctx => {
      return {
        type: `transcription.${ctx.input.currentState}`,
        id: `${ctx.input.transcriptionId}-${ctx.input.currentState}`,
        output: {
          transcriptionId: ctx.input.transcriptionId,
          name: ctx.input.name,
          previousState: ctx.input.previousState,
          currentState: ctx.input.currentState,
          language: ctx.input.language,
          audioLengthInSeconds: ctx.input.audioLengthInSeconds,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
