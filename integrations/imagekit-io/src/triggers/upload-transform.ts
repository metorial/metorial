import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let uploadTransform = SlateTrigger.create(spec, {
  name: 'Upload Transformation',
  key: 'upload_transform',
  description:
    'Triggered when a pre-upload or post-upload transformation succeeds or fails. Covers both pre-transform and post-transform events for uploaded files.'
})
  .input(
    z.object({
      eventType: z.string().describe('Full event type, e.g. "upload.pre-transform.success"'),
      eventId: z.string().describe('Unique event ID'),
      createdAt: z.string().describe('Event timestamp'),
      requestId: z.string().optional().describe('Request ID for tracing'),
      transformationValue: z.string().optional().describe('Transformation string applied'),
      fileId: z.string().optional().describe('File ID of the uploaded asset'),
      fileName: z.string().optional().describe('Name of the file'),
      filePath: z.string().optional().describe('Path of the file in the Media Library'),
      fileUrl: z.string().optional().describe('URL of the file'),
      fileType: z.string().optional().describe('Type of the file'),
      fileSize: z.number().optional().describe('Size of the file in bytes'),
      fileWidth: z.number().optional().describe('Width in pixels'),
      fileHeight: z.number().optional().describe('Height in pixels'),
      thumbnailUrl: z.string().optional().describe('Thumbnail URL'),
      errorReason: z.string().optional().describe('Error reason if the transformation failed')
    })
  )
  .output(
    z.object({
      phase: z
        .enum(['pre', 'post'])
        .describe('Whether this was a pre-upload or post-upload transformation'),
      status: z.enum(['success', 'error']).describe('Transformation result status'),
      transformationValue: z
        .string()
        .optional()
        .describe('The transformation string that was applied'),
      fileId: z.string().optional().describe('File ID of the uploaded asset'),
      fileName: z.string().optional().describe('File name'),
      filePath: z.string().optional().describe('File path in the Media Library'),
      fileUrl: z.string().optional().describe('CDN URL of the file'),
      fileType: z.string().optional().describe('File type'),
      fileSize: z.number().optional().describe('File size in bytes'),
      fileWidth: z.number().optional().describe('Width in pixels'),
      fileHeight: z.number().optional().describe('Height in pixels'),
      thumbnailUrl: z.string().optional().describe('Thumbnail URL'),
      errorReason: z.string().optional().describe('Reason for failure')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = body.type as string;

      if (!eventType?.startsWith('upload.')) {
        return { inputs: [] };
      }

      let transformationValue: string | undefined;
      if (typeof body.request?.transformation === 'string') {
        transformationValue = body.request.transformation;
      } else if (body.request?.transformation?.value) {
        transformationValue = body.request.transformation.value;
      }

      return {
        inputs: [
          {
            eventType: eventType,
            eventId: body.id,
            createdAt: body.created_at,
            requestId: body.request?.x_request_id,
            transformationValue,
            fileId: body.data?.fileId,
            fileName: body.data?.name,
            filePath: body.data?.filePath || body.data?.path,
            fileUrl: body.data?.url,
            fileType: body.data?.fileType,
            fileSize: body.data?.size,
            fileWidth: body.data?.width,
            fileHeight: body.data?.height,
            thumbnailUrl: body.data?.thumbnailUrl,
            errorReason: body.data?.transformation?.error?.reason
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let phase: 'pre' | 'post' = ctx.input.eventType.includes('pre-transform')
        ? 'pre'
        : 'post';
      let status: 'success' | 'error' = ctx.input.eventType.includes('.success')
        ? 'success'
        : 'error';

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          phase,
          status,
          transformationValue: ctx.input.transformationValue,
          fileId: ctx.input.fileId,
          fileName: ctx.input.fileName,
          filePath: ctx.input.filePath,
          fileUrl: ctx.input.fileUrl,
          fileType: ctx.input.fileType,
          fileSize: ctx.input.fileSize,
          fileWidth: ctx.input.fileWidth,
          fileHeight: ctx.input.fileHeight,
          thumbnailUrl: ctx.input.thumbnailUrl,
          errorReason: ctx.input.errorReason
        }
      };
    }
  })
  .build();
