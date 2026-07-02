import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { firefliesServiceError } from '../lib/errors';
import { spec } from '../spec';
import {
  assertLimit,
  assertNonNegativeSkip,
  mapTranscriptListItem,
  transcriptListItemSchema
} from './shared';

let normalizeScope = (scope: string | undefined) => {
  if (!scope) return undefined;
  return scope.toLowerCase();
};

export let listTranscripts = SlateTool.create(spec, {
  name: 'List Transcripts',
  key: 'list_transcripts',
  description: `Search and list meeting transcripts with filtering options. Filter by keyword, date range, organizers, participants, channel, or show only your own meetings. Returns transcript metadata, calendar details, summary preview, recent AI App outputs, sharing metadata, and pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z
        .string()
        .optional()
        .describe(
          'Search for keywords in meeting title and/or spoken words (max 255 characters)'
        ),
      scope: z
        .enum(['title', 'sentences', 'all', 'TITLE', 'SENTENCES', 'ALL'])
        .optional()
        .describe(
          'Search scope for keyword filtering. Use title, sentences, or all. Requires keyword.'
        ),
      fromDate: z
        .string()
        .optional()
        .describe(
          'Start of date range filter (ISO 8601 format, e.g. 2024-01-01T00:00:00.000Z)'
        ),
      toDate: z.string().optional().describe('End of date range filter (ISO 8601 format)'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of transcripts to return (max 50)'),
      skip: z.number().optional().describe('Number of transcripts to skip for pagination'),
      organizers: z
        .array(z.string())
        .optional()
        .describe('Filter by organizer email addresses'),
      participants: z
        .array(z.string())
        .optional()
        .describe('Filter by participant email addresses'),
      userId: z.string().optional().describe('Filter by user ID'),
      mine: z
        .boolean()
        .optional()
        .describe('If true, only return meetings owned by the API key owner'),
      channelId: z.string().optional().describe('Filter by channel ID')
    })
  )
  .output(
    z.object({
      transcripts: z.array(transcriptListItemSchema).describe('List of matching transcripts')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.keyword && ctx.input.keyword.length > 255) {
      throw firefliesServiceError('keyword must be 255 characters or fewer.');
    }
    if (ctx.input.scope && !ctx.input.keyword) {
      throw firefliesServiceError('keyword is required when scope is provided.');
    }
    assertLimit(ctx.input.limit, 'limit', 50);
    assertNonNegativeSkip(ctx.input.skip);

    let client = new FirefliesClient({ token: ctx.auth.token });

    let transcripts = await client.getTranscripts({
      keyword: ctx.input.keyword,
      scope: normalizeScope(ctx.input.scope),
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      organizers: ctx.input.organizers,
      participants: ctx.input.participants,
      userId: ctx.input.userId,
      mine: ctx.input.mine,
      channelId: ctx.input.channelId
    });

    let mapped = (transcripts || []).map((transcript: any) =>
      mapTranscriptListItem(transcript)
    );

    return {
      output: { transcripts: mapped },
      message: `Found **${mapped.length}** transcript(s).${ctx.input.keyword ? ` Keyword: "${ctx.input.keyword}"` : ''}`
    };
  })
  .build();
