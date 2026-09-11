import { SlateTool } from 'slates';
import { z } from 'zod';
import { GranolaClient } from '../lib/client';
import {
  cursorSchema,
  dateOrTimestampSchema,
  folderIdSchema,
  listMeetingsOutputSchema,
  listPageSizeSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let listMeetings = SlateTool.create(spec, {
  name: 'List Meetings',
  key: 'list_meetings',
  description:
    'List accessible Granola meetings with date, folder, and cursor filters. Results contain summary metadata only; call get_meetings for attendees and meeting content instead of fetching every list result individually.',
  instructions: [
    'Use list_meeting_folders to discover a folderId when folder filtering is needed.',
    'Batch only the meeting IDs you need into get_meetings; do not N+1-fetch every meeting returned by this list.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      createdBefore: dateOrTimestampSchema
        .optional()
        .describe('Return meetings created before this ISO date or RFC3339 timestamp.'),
      createdAfter: dateOrTimestampSchema
        .optional()
        .describe('Return meetings created after this ISO date or RFC3339 timestamp.'),
      updatedAfter: dateOrTimestampSchema
        .optional()
        .describe('Return meetings updated after this ISO date or RFC3339 timestamp.'),
      folderId: folderIdSchema
        .optional()
        .describe(
          'Return meetings in this folder or its child folders. Call list_meeting_folders to discover folder IDs.'
        ),
      cursor: cursorSchema.optional().describe('Opaque cursor returned by the previous page.'),
      pageSize: listPageSizeSchema.describe(
        'Maximum number of meetings to return, from 1 to 30.'
      )
    })
  )
  .output(listMeetingsOutputSchema)
  .handleInvocation(async ctx => {
    let page = await new GranolaClient(ctx.auth).listMeetings(ctx.input);

    return {
      output: page,
      message: `Listed ${page.meetings.length} Granola meetings.`
    };
  })
  .build();
