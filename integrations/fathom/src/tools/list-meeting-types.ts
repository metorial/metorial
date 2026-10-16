import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMeetingTypes = SlateTool.create(spec, {
  key: 'list_meeting_types',
  name: 'List Meeting Types',
  description:
    'List active and inactive meeting types in your organization. Use a returned name as the meetingType filter in list_meetings.',
  tags: { readOnly: true }
})
  .input(z.object({ cursor: z.string().optional().describe('Cursor from the previous page') }))
  .output(
    z.object({
      meetingTypes: z.array(
        z.object({
          name: z.string().describe('Meeting type name used for filtering meetings'),
          status: z
            .enum(['active', 'inactive'])
            .describe('Whether this type can be assigned to future meetings'),
          createdAt: z.string().describe('Creation time in ISO 8601 format'),
          raw: z.unknown().optional().describe('Original meeting type')
        })
      ),
      nextCursor: z.string().nullable().describe('Next page cursor, or null at the end')
    })
  )
  .handleInvocation(async ctx => {
    let page = await new Client(ctx.auth).listMeetingTypes(ctx.input.cursor);
    return {
      output: {
        meetingTypes: page.items.map(item => ({
          name: item.name,
          status: item.status,
          createdAt: item.created_at,
          raw: item
        })),
        nextCursor: page.next_cursor
      },
      message: `Found **${page.items.length}** meeting type(s).${page.next_cursor === null ? '' : ' More results are available.'}`
    };
  })
  .build();
