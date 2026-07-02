import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let studioVideoWebhook = SlateTrigger.create(spec, {
  name: 'Studio Video Events',
  key: 'studio_video_events',
  description:
    'Receives webhook events from the Studio API when personalized video generation completes or fails. Register this webhook URL for a project using the Studio API webhook registration. Each event contains status and video URL per unique video ID.'
})
  .input(
    z.object({
      uniqueId: z.string().describe('The unique video ID from the original bulk request'),
      inferenceId: z.string().describe('Inference ID for this video'),
      succeeded: z.boolean().describe('Whether video generation succeeded'),
      videoUrl: z.string().nullable().describe('Video URL if succeeded'),
      errorStatusCode: z.number().nullable().describe('Error status code if failed'),
      errorMessage: z.string().nullable().describe('Error message if failed')
    })
  )
  .output(
    z.object({
      uniqueId: z.string().describe('The unique video ID'),
      inferenceId: z.string().describe('Inference ID for this video'),
      succeeded: z.boolean().describe('Whether video generation succeeded'),
      videoUrl: z.string().nullable().describe('Video URL if succeeded'),
      errorStatusCode: z.number().nullable().describe('Error status code if failed'),
      errorMessage: z.string().nullable().describe('Error message if failed')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;
      let inputs: Array<{
        uniqueId: string;
        inferenceId: string;
        succeeded: boolean;
        videoUrl: string | null;
        errorStatusCode: number | null;
        errorMessage: string | null;
      }> = [];

      for (let [uniqueId, entry] of Object.entries(data)) {
        let videoEntry = entry as Record<string, unknown>;
        let succeeded = videoEntry.status === true;
        let error = videoEntry.error as Record<string, unknown> | undefined;

        inputs.push({
          uniqueId,
          inferenceId: (videoEntry.inference_id as string) || '',
          succeeded,
          videoUrl: succeeded ? (videoEntry.video_url as string) || null : null,
          errorStatusCode: error ? (error.status_code as number) || null : null,
          errorMessage: error ? (error.message as string) || null : null
        });
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let type = ctx.input.succeeded ? 'video.succeeded' : 'video.failed';

      return {
        type,
        id: `video_${ctx.input.uniqueId}_${ctx.input.inferenceId}_${type}`,
        output: {
          uniqueId: ctx.input.uniqueId,
          inferenceId: ctx.input.inferenceId,
          succeeded: ctx.input.succeeded,
          videoUrl: ctx.input.videoUrl,
          errorStatusCode: ctx.input.errorStatusCode,
          errorMessage: ctx.input.errorMessage
        }
      };
    }
  })
  .build();
