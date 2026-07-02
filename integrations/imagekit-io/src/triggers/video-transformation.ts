import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let videoTransformation = SlateTrigger.create(spec, {
  name: 'Video Transformation',
  key: 'video_transformation',
  description:
    'Triggered when a video transformation is accepted, completed, or fails. Covers the full lifecycle of asynchronous video encoding operations.'
})
  .input(
    z.object({
      eventType: z
        .enum(['accepted', 'ready', 'error'])
        .describe('Type of video transformation event'),
      eventId: z.string().describe('Unique event ID'),
      createdAt: z.string().describe('Event timestamp'),
      requestId: z.string().optional().describe('Request ID for tracing'),
      requestUrl: z.string().optional().describe('URL that triggered the transformation'),
      assetUrl: z.string().optional().describe('Original asset URL'),
      transformationType: z.string().optional().describe('Type of transformation'),
      transformationOptions: z
        .record(z.string(), z.any())
        .optional()
        .describe('Transformation options applied'),
      outputUrl: z.string().optional().describe('URL of the transformed output (when ready)'),
      videoMetadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Video metadata of the output (when ready)'),
      timings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Timing information (when ready)'),
      errorReason: z.string().optional().describe('Error reason (when error)')
    })
  )
  .output(
    z.object({
      assetUrl: z.string().describe('URL of the source video asset'),
      transformationStatus: z
        .enum(['accepted', 'ready', 'error'])
        .describe('Current status of the transformation'),
      requestUrl: z.string().optional().describe('URL that triggered the transformation'),
      transformationOptions: z
        .record(z.string(), z.any())
        .optional()
        .describe('Options used for the transformation'),
      outputUrl: z
        .string()
        .optional()
        .describe('URL of the transformed video (available when ready)'),
      videoWidth: z.number().optional().describe('Width of the output video'),
      videoHeight: z.number().optional().describe('Height of the output video'),
      videoDuration: z.number().optional().describe('Duration of the output video in seconds'),
      videoBitrate: z.number().optional().describe('Bitrate of the output video'),
      downloadDuration: z
        .number()
        .optional()
        .describe('Time taken to download the source in ms'),
      encodingDuration: z.number().optional().describe('Time taken for encoding in ms'),
      errorReason: z.string().optional().describe('Reason for failure')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = body.type as string;

      if (!eventType?.startsWith('video.transformation.')) {
        return { inputs: [] };
      }

      let status = eventType.replace('video.transformation.', '') as
        | 'accepted'
        | 'ready'
        | 'error';

      return {
        inputs: [
          {
            eventType: status,
            eventId: body.id,
            createdAt: body.created_at,
            requestId: body.request?.x_request_id,
            requestUrl: body.request?.url,
            assetUrl: body.data?.asset?.url,
            transformationType: body.data?.transformation?.type,
            transformationOptions: body.data?.transformation?.options,
            outputUrl: body.data?.transformation?.output?.url,
            videoMetadata: body.data?.transformation?.output?.video_metadata,
            timings: body.timings,
            errorReason: body.data?.transformation?.error?.reason
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let videoMeta = ctx.input.videoMetadata;

      return {
        type: `video.transformation.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          assetUrl: ctx.input.assetUrl || '',
          transformationStatus: ctx.input.eventType,
          requestUrl: ctx.input.requestUrl,
          transformationOptions: ctx.input.transformationOptions,
          outputUrl: ctx.input.outputUrl,
          videoWidth: videoMeta?.width as number | undefined,
          videoHeight: videoMeta?.height as number | undefined,
          videoDuration: videoMeta?.duration as number | undefined,
          videoBitrate: videoMeta?.bitrate as number | undefined,
          downloadDuration: ctx.input.timings?.download_duration as number | undefined,
          encodingDuration: ctx.input.timings?.encoding_duration as number | undefined,
          errorReason: ctx.input.errorReason
        }
      };
    }
  })
  .build();
