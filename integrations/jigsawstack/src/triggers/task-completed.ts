import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let taskCompleted = SlateTrigger.create(spec, {
  name: 'Task Completed',
  key: 'task_completed',
  description:
    'Receives webhook notifications when long-running JigsawStack tasks complete (e.g., speech-to-text transcription). Configure the webhook URL in your JigsawStack API request using the webhook_url parameter.',
  instructions: [
    'Use the provided webhook URL as the webhook_url parameter when calling JigsawStack long-running APIs (e.g., speech-to-text).',
    'JigsawStack will POST the completed result to this webhook URL when processing finishes.'
  ]
})
  .input(
    z.object({
      eventId: z.string().describe('Unique identifier for this event'),
      taskType: z.string().describe('Type of task that completed (e.g., "transcription")'),
      success: z.boolean().describe('Whether the task completed successfully'),
      text: z.string().optional().describe('Transcription text (for speech-to-text tasks)'),
      chunks: z
        .array(
          z.object({
            text: z.string().optional(),
            timestamp: z.array(z.number()).optional()
          })
        )
        .optional()
        .describe('Timestamped transcript segments'),
      speakers: z
        .array(
          z.object({
            speaker: z.string().optional(),
            text: z.string().optional(),
            timestamp: z.array(z.number()).optional()
          })
        )
        .optional()
        .describe('Speaker-separated transcripts'),
      languageDetected: z.string().optional().describe('Detected language'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the task completed successfully'),
      taskType: z.string().describe('Type of task that completed'),
      text: z.string().optional().describe('Transcription text (for speech-to-text)'),
      chunks: z
        .array(
          z.object({
            text: z.string().optional(),
            timestamp: z.array(z.number()).optional()
          })
        )
        .optional()
        .describe('Timestamped segments'),
      speakers: z
        .array(
          z.object({
            speaker: z.string().optional(),
            text: z.string().optional(),
            timestamp: z.array(z.number()).optional()
          })
        )
        .optional()
        .describe('Speaker-separated transcripts'),
      languageDetected: z.string().optional().describe('Detected language')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: Record<string, unknown>;
      try {
        data = (await ctx.request.json()) as Record<string, unknown>;
      } catch {
        return { inputs: [] };
      }

      let taskType = 'unknown';
      if (data.text !== undefined || data.chunks !== undefined) {
        taskType = 'transcription';
      }

      let eventId = (data.id as string) || (data.log_id as string) || `webhook-${Date.now()}`;

      return {
        inputs: [
          {
            eventId,
            taskType,
            success: (data.success as boolean) ?? true,
            text: data.text as string | undefined,
            chunks: data.chunks as Array<{ text?: string; timestamp?: number[] }> | undefined,
            speakers: data.speakers as
              | Array<{ speaker?: string; text?: string; timestamp?: number[] }>
              | undefined,
            languageDetected: data.language_detected as string | undefined,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `task.${ctx.input.taskType}`,
        id: ctx.input.eventId,
        output: {
          success: ctx.input.success,
          taskType: ctx.input.taskType,
          text: ctx.input.text,
          chunks: ctx.input.chunks,
          speakers: ctx.input.speakers,
          languageDetected: ctx.input.languageDetected
        }
      };
    }
  })
  .build();
