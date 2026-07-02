import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let encodeVideo = SlateTool.create(spec, {
  name: 'Encode Video',
  key: 'encode_video',
  description: `Start a video encoding job. Supports converting to MP4, WEBM, or OGG, with options for resizing, quality, cutting, and thumbnail generation. Encoding is asynchronous — returns a token for status polling.`,
  instructions: [
    'Dimensions must be non-zero integers divisible by 4.',
    'Time format for cut operations is "HHH:MM:SS.sss" or "SSSS.sss". Length can be "end" to cut to the end.',
    'Thumbnail generation must be the last operation in the chain.'
  ]
})
  .input(
    z.object({
      fileId: z.string().describe('UUID of the source video file'),
      format: z
        .enum(['mp4', 'webm', 'ogg'])
        .optional()
        .describe('Target video format (default: mp4)'),
      width: z.number().optional().describe('Target width in pixels (must be divisible by 4)'),
      height: z
        .number()
        .optional()
        .describe('Target height in pixels (must be divisible by 4)'),
      resizeMode: z
        .enum(['preserve_ratio', 'change_ratio', 'scale_crop', 'add_padding'])
        .optional()
        .describe('How to handle aspect ratio when resizing'),
      quality: z
        .enum(['normal', 'better', 'best', 'lighter', 'lightest'])
        .optional()
        .describe('Video quality preset'),
      cutStart: z
        .string()
        .optional()
        .describe('Start time for cutting (format: "HH:MM:SS.sss" or "SS.sss")'),
      cutLength: z
        .string()
        .optional()
        .describe('Duration of the cut segment (format: "HH:MM:SS.sss", "SS.sss", or "end")'),
      thumbnailCount: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Number of thumbnails to generate (1-50)'),
      store: z.boolean().optional().describe('Whether to permanently store the result')
    })
  )
  .output(
    z.object({
      conversionToken: z.number().describe('Token for checking encoding status'),
      resultFileId: z
        .string()
        .describe('UUID of the result video file (may not be ready immediately)'),
      thumbnailsGroupId: z.string().optional().describe('Group UUID for generated thumbnails'),
      problems: z.record(z.string(), z.string()).describe('Any problems encountered')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let path = `${ctx.input.fileId}/video/`;

    if (ctx.input.width !== undefined || ctx.input.height !== undefined) {
      let w = ctx.input.width ?? '';
      let h = ctx.input.height ?? '';
      path += `-/size/${w}x${h}/`;
      if (ctx.input.resizeMode) path += `${ctx.input.resizeMode}/`;
    }

    if (ctx.input.quality) path += `-/quality/${ctx.input.quality}/`;
    if (ctx.input.format) path += `-/format/${ctx.input.format}/`;

    if (ctx.input.cutStart !== undefined && ctx.input.cutLength !== undefined) {
      path += `-/cut/${ctx.input.cutStart}/${ctx.input.cutLength}/`;
    }

    if (ctx.input.thumbnailCount !== undefined) {
      path += `-/thumbs~${ctx.input.thumbnailCount}/`;
    }

    let result = await client.convertVideo([path], ctx.input.store);

    let first = result.result[0];
    if (!first) {
      throw new Error('No encoding result returned');
    }

    return {
      output: {
        conversionToken: first.token,
        resultFileId: first.uuid,
        thumbnailsGroupId: first.thumbnails_group_uuid,
        problems: result.problems
      },
      message: `Video encoding started. Result file UUID: **${first.uuid}**, token: \`${first.token}\`.${first.thumbnails_group_uuid ? ` Thumbnails group: ${first.thumbnails_group_uuid}` : ''}`
    };
  })
  .build();

export let getVideoEncodingStatus = SlateTool.create(spec, {
  name: 'Get Video Encoding Status',
  key: 'get_video_encoding_status',
  description: `Check the status of an asynchronous video encoding job. Returns the current status and the resulting file info when complete.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conversionToken: z
        .number()
        .describe('Conversion token returned by the Encode Video tool')
    })
  )
  .output(
    z.object({
      status: z
        .enum(['pending', 'processing', 'finished', 'failed', 'cancelled'])
        .describe('Current encoding status'),
      error: z.string().nullable().describe('Error message if encoding failed'),
      resultFileId: z
        .string()
        .nullable()
        .describe('UUID of the encoded video file (available when finished)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let status = await client.getVideoConversionStatus(ctx.input.conversionToken);

    return {
      output: {
        status: status.status as any,
        error: status.error,
        resultFileId: status.result?.uuid ?? null
      },
      message: `Encoding status: **${status.status}**.${status.result ? ` Result file: ${status.result.uuid}` : ''}${status.error ? ` Error: ${status.error}` : ''}`
    };
  })
  .build();
