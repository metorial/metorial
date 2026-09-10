import { createHash } from 'node:crypto';
import { createBase64Attachment, createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import {
  amplitudeIdSchema,
  createAnalyticsClient,
  replayIdSchema
} from '../lib/analytics-client';
import { DOWNLOAD_LIMIT } from '../lib/downloads';
import { amplitudeServiceError } from '../lib/errors';
import { spec } from '../spec';
import { cursorInput, fileSchema, tags, userIdInput } from './project-analytics-schemas';

export const listSessionReplaysTool = SlateTool.create(spec, {
  name: 'List Session Replays',
  key: 'list_session_replays',
  tags,
  description:
    'Discover session replay IDs and metadata in the connected project, optionally by time or an Amplitude ID from search_users. Use export_session_replay to download recording chunks. Requires project API key and secret.',
  constraints: [
    'Keep sortOrder and filters consistent when following nextCursor.',
    'replayIds cannot be combined with amplitudeId or cursor. With replayIds, the provider ignores limit and returns no next cursor.'
  ]
})
  .authMethods(['api_key_secret'])
  .input(
    z.object({
      startTime: z.iso
        .datetime({ offset: true })
        .optional()
        .describe('Inclusive lower bound on replay start time in ISO 8601 format.'),
      endTime: z.iso
        .datetime({ offset: true })
        .optional()
        .describe('Inclusive upper bound on replay start time in ISO 8601 format.'),
      amplitudeId: userIdInput.optional(),
      replayIds: z
        .array(replayIdSchema)
        .min(1)
        .max(100)
        .optional()
        .describe(
          'Specific device_id/session_id replay IDs. Cannot be combined with amplitudeId or cursor.'
        ),
      cursor: cursorInput,
      limit: z.number().int().min(1).max(200).default(50),
      sortOrder: z
        .enum(['asc', 'desc'])
        .default('asc')
        .describe(
          'Oldest first (asc) or newest first (desc); must remain consistent across cursor pages.'
        )
    })
  )
  .output(
    z.object({
      replays: z.array(
        z.object({
          replayId: z.string(),
          sessionId: z.string(),
          deviceId: z.string(),
          amplitudeId: amplitudeIdSchema,
          startTime: z.string(),
          endTime: z.string(),
          retentionInDays: z.number()
        })
      ),
      nextCursor: z.string().nullable(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    const result = await createAnalyticsClient(ctx).listSessionReplays(ctx.input);
    return {
      output: {
        replays: result.session_replays.map(replay => ({
          replayId: replay.replay_id,
          sessionId: replay.session_id,
          deviceId: replay.device_id,
          amplitudeId: replay.amplitude_id,
          startTime: replay.start_time,
          endTime: replay.end_time,
          retentionInDays: replay.retention_in_days
        })),
        nextCursor: result.next_page_token,
        hasMore: result.next_page_token !== null
      },
      message: `Retrieved ${result.session_replays.length} session replays.`
    };
  })
  .build();

export const exportSessionReplayTool = SlateTool.create(spec, {
  name: 'Export Session Replay',
  key: 'export_session_replay',
  tags,
  description:
    'Download one ordered page of gzip-compressed version 3 rrweb JSON chunks and a JSON manifest for a replay discovered with list_session_replays. Follow nextCursor until hasMore is false to collect a full recording. Requires project API key and secret.',
  constraints: [
    'Maximum 32 MiB of files per invocation; lower limit if a page is too large. Each file download has a 30-second timeout.',
    'Downloads preserve compressed recording bytes. Playback, transcoding, and video export are not provided.'
  ]
})
  .authMethods(['api_key_secret'])
  .input(
    z.object({
      replayId: replayIdSchema.describe(
        'Replay ID from list_session_replays, in device_id/session_id format.'
      ),
      cursor: cursorInput,
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(10)
        .describe(
          'Maximum recording chunks on this page. Lower this if the download exceeds 32 MiB.'
        )
    })
  )
  .output(
    z.object({
      replayId: z.string(),
      version: z.literal(3),
      files: z.array(fileSchema.extend({ order: z.number().int() })),
      manifestFileName: z.string(),
      nextCursor: z.string().nullable(),
      hasMore: z.boolean(),
      pageComplete: z.literal(true),
      replayComplete: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    const result = await createAnalyticsClient(ctx).exportSessionReplay(ctx.input);
    const pageKey = createHash('sha256')
      .update(ctx.input.replayId)
      .update(ctx.input.cursor ?? 'first')
      .digest('hex')
      .slice(0, 12);
    const files = result.files.map((file, index) => ({
      fileName: `replay-${pageKey}-${String(index + 1).padStart(3, '0')}.json.gz`,
      contentType: file.contentType,
      byteLength: file.bytes.byteLength,
      order: index + 1
    }));
    const output = {
      replayId: ctx.input.replayId,
      version: 3 as const,
      files,
      manifestFileName: `replay-${pageKey}-manifest.json`,
      nextCursor: result.nextCursor,
      hasMore: result.nextCursor !== null,
      pageComplete: true as const,
      replayComplete: ctx.input.cursor === undefined && result.nextCursor === null
    };
    const manifest = JSON.stringify(
      {
        ...output,
        cursor: ctx.input.cursor ?? null,
        instructions:
          'Files are ordered within this page. Gzip-decompress each file to obtain a JSON array of rrweb events. Concatenate arrays in page and file order after downloading every page.'
      },
      null,
      2
    );
    if (
      files.reduce((total, file) => total + file.byteLength, Buffer.byteLength(manifest)) >
      DOWNLOAD_LIMIT
    )
      throw amplitudeServiceError(
        'The export exceeds 32 MiB including its manifest. Retry with a lower page limit.'
      );
    return {
      output,
      attachments: [
        ...result.files.map(file =>
          createBase64Attachment(file.bytes.toString('base64'), file.contentType)
        ),
        createTextAttachment(manifest, 'application/json')
      ],
      message: `Downloaded ${files.length} ordered replay chunks and their manifest.${output.hasMore ? ' Continue with nextCursor for the remaining chunks.' : ctx.input.cursor ? ' This is the final page; keep the preceding pages to complete the recording.' : ' The complete recording is included.'}`
    };
  })
  .build();
