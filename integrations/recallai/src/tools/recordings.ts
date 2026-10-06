import { createApiServiceError, getFileUrlTool, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, nextCursor } from '../lib/client';
import { recordingOutput, recordingSchema } from '../lib/schemas';
import { spec } from '../spec';

export const listRecordingsTool = SlateTool.create(spec, {
  name: 'List Recordings',
  key: 'list_recordings',
  description:
    'Find recording IDs, processing status, and available media for meeting bots. Use these IDs with get_recording and download_recording.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Continuation value from nextCursor'),
      botId: z.string().optional().describe('Bot ID from list_bots'),
      createdAtAfter: z.string().optional().describe('Earliest creation time, ISO 8601'),
      createdAtBefore: z.string().optional().describe('Latest creation time, ISO 8601'),
      statusCode: z
        .enum(['processing', 'paused', 'done', 'failed'])
        .optional()
        .describe('Recording processing status')
    })
  )
  .output(
    z.object({ nextCursor: z.string().nullable(), recordings: z.array(recordingSchema) })
  )
  .handleInvocation(async ctx => {
    const result = await new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    }).listRecordings(ctx.input);
    return {
      output: {
        nextCursor: nextCursor(result.next),
        recordings: result.results.map(recordingOutput)
      },
      message: `Retrieved ${result.results.length} recordings.`
    };
  })
  .build();
export const getRecordingTool = SlateTool.create(spec, {
  name: 'Get Recording',
  key: 'get_recording',
  description:
    'Read a recording, its processing state, and the media it captured. Discover recording IDs with list_recordings or get_bot.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      recordingId: z.string().min(1).describe('Recording ID from list_recordings or get_bot')
    })
  )
  .output(recordingSchema)
  .handleInvocation(async ctx => {
    const recording = await new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    }).getRecording(ctx.input.recordingId);
    return {
      output: recordingOutput(recording),
      message: recording.status
        ? `Recording ${recording.id} is ${recording.status}.`
        : `Retrieved recording ${recording.id}; its processing status is unavailable.`
    };
  })
  .build();
const referenceSchema = z.object({
  recordingId: z.string().min(1),
  mediaKind: z.enum(['video_mixed', 'audio_mixed', 'transcript'])
});
export const downloadRecordingTool = SlateTool.create(spec, {
  name: 'Download Recording',
  key: 'download_recording',
  description:
    'Prepare a downloadable mixed video, mixed audio, or transcript file for a completed recording. Discover recording IDs and available media with get_recording.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      recordingId: z.string().min(1).describe('Recording ID from list_recordings or get_bot'),
      mediaKind: referenceSchema.shape.mediaKind
        .optional()
        .describe('Media to download; defaults to video_mixed')
    })
  )
  .output(
    z.object({
      recordingId: z.string(),
      mediaId: z.string(),
      mediaKind: referenceSchema.shape.mediaKind,
      filename: z.string(),
      mimeType: z.string()
    })
  )
  .handleInvocation(async ctx => {
    const reference = {
      recordingId: ctx.input.recordingId,
      mediaKind: ctx.input.mediaKind ?? ('video_mixed' as const)
    };
    const file = await new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    }).getRecordingFile(reference.recordingId, reference.mediaKind);
    await ctx.addAttachment({
      type: 'url',
      url: file.url,
      filename: file.filename,
      mimeType: file.mimeType,
      refreshReference: reference,
      refreshAt: file.expiresAt
    });
    return {
      output: {
        recordingId: file.recordingId,
        mediaId: file.mediaId,
        mediaKind: file.mediaKind,
        filename: file.filename,
        mimeType: file.mimeType
      },
      message: `Prepared the ${file.mediaKind} file for recording ${file.recordingId}.`
    };
  })
  .build();
export const getFileUrl = getFileUrlTool(spec, async ctx => {
  const parsed = referenceSchema.safeParse(ctx.input.reference);
  if (!parsed.success)
    throw createApiServiceError('The file reference is invalid. Request the recording again.');
  const file = await new Client({
    token: ctx.auth.token,
    region: ctx.config.region
  }).getRecordingFile(parsed.data.recordingId, parsed.data.mediaKind);
  return { url: file.url, expiresAt: file.expiresAt };
});
