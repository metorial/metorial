import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  actionItemSchema,
  mapActionItem,
  mapTranscriptEntry,
  summarySchema,
  transcriptEntrySchema
} from '../lib/schemas';
import { spec } from '../spec';

export let getMeetingDetails = SlateTool.create(spec, {
  name: 'Get Meeting Details',
  key: 'get_meeting_details',
  description: `Retrieve a meeting recording's transcript, AI summary, and action items. Transcripts and summaries use dedicated endpoints. Action items are searched in the first five meeting-list pages.

Provide the recordingId from list_meetings; the number in a Fathom call URL is a different identifier.`,
  instructions: [
    'Use recordingId from list_meetings to identify the recording.',
    'Set includeTranscript, includeSummary, and includeActionItems to choose the requested data.',
    'If actionItemsSearch has a nextCursor, continue with list_meetings and includeActionItems to search older recordings.'
  ],
  constraints: [
    'Requested transcript or summary failures are reported as errors.',
    'Action items are searched in at most five pages; an unfound recording is not evidence that it has no action items.',
    'The global limit is 60 requests per minute. Summary and transcript calls have a separate heavy-request limit, normally 30 per minute and sometimes 5.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      recordingId: z
        .number()
        .describe('Recording ID returned by list_meetings, not the number in a call URL'),
      includeTranscript: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to fetch the full transcript'),
      includeSummary: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to fetch the AI summary'),
      includeActionItems: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to fetch action items')
    })
  )
  .output(
    z.object({
      transcript: z
        .array(transcriptEntrySchema)
        .nullable()
        .describe('Full speaker-labeled transcript'),
      summary: summarySchema.nullable().describe('AI-generated meeting summary'),
      actionItems: z.array(actionItemSchema).nullable().describe('AI-extracted action items'),
      actionItemsSearch: z
        .object({
          found: z.boolean().describe('Whether the recording was found in the searched pages'),
          pagesScanned: z.number().describe('Number of meeting pages searched'),
          nextCursor: z
            .string()
            .nullable()
            .describe('Next unsearched page, or null when the search reached the end')
        })
        .optional(),
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Original responses for the requested data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { recordingId, includeTranscript, includeSummary, includeActionItems } = ctx.input;
    if (!Number.isSafeInteger(recordingId) || recordingId <= 0) {
      throw createApiServiceError(
        'recordingId must be a positive whole-number recording ID from list_meetings.'
      );
    }
    let transcript: z.infer<typeof transcriptEntrySchema>[] | null = null;
    let summary: z.infer<typeof summarySchema> | null = null;
    let actionItems: z.infer<typeof actionItemSchema>[] | null = null;
    let raw: Record<string, unknown> = {};
    let actionItemsSearch:
      | { found: boolean; pagesScanned: number; nextCursor: string | null }
      | undefined;

    if (includeTranscript) {
      let data = await client.getTranscript(recordingId);
      transcript = data.transcript.map(mapTranscriptEntry);
      raw.transcript = data;
    }
    if (includeSummary) {
      let data = await client.getSummary(recordingId);
      summary = {
        templateName: data.summary.template_name,
        content: data.summary.markdown_formatted
      };
      raw.summary = data;
    }
    if (includeActionItems) {
      let cursor: string | undefined;
      let seen = new Set<string>();
      actionItemsSearch = { found: false, pagesScanned: 0, nextCursor: null };
      do {
        if (cursor !== undefined) {
          if (seen.has(cursor))
            throw createApiServiceError(
              'Fathom repeated a meeting pagination cursor. Retry the request.'
            );
          seen.add(cursor);
        }
        let page = await client.listMeetings({ includeActionItems: true, cursor });
        actionItemsSearch.pagesScanned++;
        actionItemsSearch.nextCursor = page.next_cursor;
        let meeting = page.items.find(item => item.recording_id === recordingId);
        if (meeting) {
          actionItemsSearch.found = true;
          if (meeting.action_items === undefined) {
            throw createApiServiceError(
              'Fathom omitted the requested action items for this recording.',
              { reason: 'fathom_invalid_response' }
            );
          }
          actionItems =
            meeting.action_items === null ? null : meeting.action_items.map(mapActionItem);
          raw.meeting = meeting;
          break;
        }
        cursor = page.next_cursor === null ? undefined : page.next_cursor;
      } while (cursor !== undefined && actionItemsSearch.pagesScanned < 5);
    }

    let parts: string[] = [];
    if (transcript !== null) parts.push(`**${transcript.length}** transcript entries`);
    if (summary?.content) parts.push('AI summary');
    if (actionItems !== null) parts.push(`**${actionItems.length}** action items`);
    let searchNote =
      actionItemsSearch && !actionItemsSearch.found
        ? ` Recording not found in ${actionItemsSearch.pagesScanned} meeting page(s); action items remain unknown.${actionItemsSearch.nextCursor === null ? '' : ' Continue with list_meetings using the returned cursor.'}`
        : '';
    return {
      output: {
        transcript,
        summary,
        actionItems,
        ...(actionItemsSearch ? { actionItemsSearch } : {}),
        raw
      },
      message: `${parts.length ? `Retrieved ${parts.join(', ')} for recording **${recordingId}**.` : `No requested content was available for recording **${recordingId}**.`}${searchNote}`
    };
  })
  .build();
