import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTranscriptions = SlateTool.create(spec, {
  name: 'List Transcriptions',
  key: 'list_transcriptions',
  description:
    'Discover pre-recorded or live transcription jobs, with status and creation-date filters. Use returned IDs with get_transcription or get_live_session_result.',
  instructions: ['Pass nextOffset as offset to retrieve the next page with the same filters.'],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      kind: z
        .enum(['pre-recorded', 'live'])
        .optional()
        .describe('Job type. Defaults to pre-recorded.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Page size, 1-100. Defaults to 20.'),
      offset: z.number().int().min(0).optional().describe('Pagination offset. Defaults to 0.'),
      status: z
        .array(z.enum(['queued', 'processing', 'done', 'error']))
        .optional()
        .describe('Filter by one or more job statuses.'),
      date: z.string().optional().describe('Creation date in YYYY-MM-DD format.'),
      beforeDate: z
        .string()
        .optional()
        .describe('Only jobs created before this ISO timestamp.'),
      afterDate: z.string().optional().describe('Only jobs created after this ISO timestamp.')
    })
  )
  .output(
    z.object({
      transcriptions: z.array(
        z.object({
          transcriptionId: z.string(),
          kind: z.string(),
          status: z.string(),
          createdAt: z.string(),
          completedAt: z.string().nullable(),
          filename: z.string().optional(),
          audioDuration: z.number().optional(),
          customMetadata: z.record(z.string(), z.unknown()).optional()
        })
      ),
      nextOffset: z.number().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let offset = ctx.input.offset ?? 0;
    let limit = ctx.input.limit ?? 20;
    let kind = ctx.input.kind ?? 'pre-recorded';
    let result = await new Client({ token: ctx.auth.token }).listTranscriptions({
      kind,
      offset,
      limit,
      status: ctx.input.status,
      date: ctx.input.date,
      before_date: ctx.input.beforeDate,
      after_date: ctx.input.afterDate
    });
    return {
      output: {
        transcriptions: result.items.map(item => ({
          transcriptionId: item.id,
          kind: item.kind ?? kind,
          status: item.status,
          createdAt: item.created_at,
          completedAt: item.completed_at ?? null,
          filename: item.file?.filename,
          audioDuration: item.file?.audio_duration,
          customMetadata: item.custom_metadata
        })),
        nextOffset: result.next ? offset + limit : null
      },
      message: `Found ${result.items.length} ${kind} transcription jobs.`
    };
  })
  .build();
