import { SlateTool } from 'slates';
import { z } from 'zod';
import { GranolaClient } from '../lib/client';
import {
  cursorSchema,
  listMeetingFoldersOutputSchema,
  listPageSizeSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let listMeetingFolders = SlateTool.create(spec, {
  name: 'List Meeting Folders',
  key: 'list_meeting_folders',
  description:
    'List accessible Granola meeting folders in alphabetical order, including parent-folder relationships and cursor pagination.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      cursor: cursorSchema.optional().describe('Opaque cursor returned by the previous page.'),
      pageSize: listPageSizeSchema.describe(
        'Maximum number of folders to return, from 1 to 30.'
      )
    })
  )
  .output(listMeetingFoldersOutputSchema)
  .handleInvocation(async ctx => {
    let page = await new GranolaClient(ctx.auth).listMeetingFolders(ctx.input);

    return {
      output: page,
      message: `Listed ${page.folders.length} Granola meeting folders.`
    };
  })
  .build();
