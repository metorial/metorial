import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SpeechToTextClient } from '../lib/client';
import { spec } from '../spec';

export let batchTranscriptionCompleted = SlateTrigger.create(spec, {
  name: 'Batch Transcription Completed',
  key: 'batch_transcription_completed',
  description:
    'Triggers when a batch transcription job completes (succeeds or fails). Polls for status changes on all transcription jobs.'
})
  .input(
    z.object({
      transcriptionId: z.string().describe('Unique identifier of the transcription'),
      status: z
        .string()
        .describe('Terminal status of the transcription ("Succeeded" or "Failed")'),
      displayName: z.string().describe('Display name of the transcription'),
      locale: z.string().describe('Locale of the transcription'),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      lastUpdatedAt: z.string().describe('ISO 8601 timestamp of last status update')
    })
  )
  .output(
    z.object({
      transcriptionId: z.string().describe('Unique identifier of the completed transcription'),
      status: z.string().describe('Final status: "Succeeded" or "Failed"'),
      displayName: z.string().describe('Display name of the transcription'),
      locale: z.string().describe('Locale of the transcription'),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      lastUpdatedAt: z.string().describe('ISO 8601 timestamp of last status update'),
      filesUri: z
        .string()
        .optional()
        .describe('URI to fetch transcription result files (when Succeeded)')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new SpeechToTextClient({
        token: ctx.auth.token,
        region: ctx.config.region
      });

      let result = await client.listTranscriptions({ top: 100 });
      let values = result.values || result || [];

      let seenIds: Record<string, string> =
        (ctx.state?.seenCompletedIds as Record<string, string>) || {};

      let inputs: {
        transcriptionId: string;
        status: string;
        displayName: string;
        locale: string;
        createdAt: string;
        lastUpdatedAt: string;
      }[] = [];

      for (let t of values as any[]) {
        if (t.status !== 'Succeeded' && t.status !== 'Failed') continue;

        let selfUri = t.self as string;
        let transcriptionId = selfUri.split('/transcriptions/')[1]?.split('?')[0] || selfUri;

        if (seenIds[transcriptionId]) continue;

        seenIds[transcriptionId] = t.status;

        inputs.push({
          transcriptionId,
          status: t.status,
          displayName: t.displayName,
          locale: t.locale,
          createdAt: t.createdDateTime,
          lastUpdatedAt: t.lastActionDateTime
        });
      }

      // Keep only the last 500 seen IDs to prevent unbounded state growth
      let allKeys = Object.keys(seenIds);
      if (allKeys.length > 500) {
        let keysToRemove = allKeys.slice(0, allKeys.length - 500);
        for (let key of keysToRemove) {
          delete seenIds[key];
        }
      }

      return {
        inputs,
        updatedState: {
          seenCompletedIds: seenIds
        }
      };
    },

    handleEvent: async ctx => {
      let client = new SpeechToTextClient({
        token: ctx.auth.token,
        region: ctx.config.region
      });

      let filesUri: string | undefined;
      if (ctx.input.status === 'Succeeded') {
        try {
          let detail = await client.getTranscription(ctx.input.transcriptionId);
          filesUri = detail.links?.files;
        } catch {
          // Files URI not critical, continue without it
        }
      }

      return {
        type: `transcription.${ctx.input.status.toLowerCase()}`,
        id: `transcription-${ctx.input.transcriptionId}-${ctx.input.status}`,
        output: {
          transcriptionId: ctx.input.transcriptionId,
          status: ctx.input.status,
          displayName: ctx.input.displayName,
          locale: ctx.input.locale,
          createdAt: ctx.input.createdAt,
          lastUpdatedAt: ctx.input.lastUpdatedAt,
          filesUri
        }
      };
    }
  })
  .build();
