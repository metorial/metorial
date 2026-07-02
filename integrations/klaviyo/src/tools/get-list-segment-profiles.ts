import { SlateTool } from 'slates';
import { z } from 'zod';
import { klaviyoServiceError } from '../lib/errors';
import { createClient, extractPaginationCursor } from '../lib/helpers';
import { spec } from '../spec';

export let getListSegmentProfiles = SlateTool.create(spec, {
  name: 'Get List or Segment Profiles',
  key: 'get_list_segment_profiles',
  description: `Retrieve profiles belonging to a specific list or segment in Klaviyo. Supports filtering and pagination.
Use this to see who is in a particular audience.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z
        .string()
        .optional()
        .describe('List ID to get profiles from (use this OR segmentId)'),
      segmentId: z
        .string()
        .optional()
        .describe('Segment ID to get profiles from (use this OR listId)'),
      filter: z.string().optional().describe('Additional filter on profiles'),
      pageCursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z.number().optional().describe('Results per page (max 100)')
    })
  )
  .output(
    z.object({
      profiles: z
        .array(
          z.object({
            profileId: z.string().describe('Profile ID'),
            email: z.string().optional().describe('Email address'),
            phoneNumber: z.string().optional().describe('Phone number'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name')
          })
        )
        .describe('Profiles in the list/segment'),
      nextCursor: z.string().optional().describe('Cursor for next page'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (!ctx.input.listId && !ctx.input.segmentId) {
      throw klaviyoServiceError('Either listId or segmentId must be provided');
    }

    let result: any;
    let sourceName: string;

    if (ctx.input.listId) {
      result = await client.getListProfiles(ctx.input.listId, {
        filter: ctx.input.filter,
        pageCursor: ctx.input.pageCursor,
        pageSize: ctx.input.pageSize
      });
      sourceName = `list ${ctx.input.listId}`;
    } else {
      result = await client.getSegmentProfiles(ctx.input.segmentId!, {
        filter: ctx.input.filter,
        pageCursor: ctx.input.pageCursor,
        pageSize: ctx.input.pageSize
      });
      sourceName = `segment ${ctx.input.segmentId}`;
    }

    let profiles = result.data.map((p: any) => ({
      profileId: p.id ?? '',
      email: p.attributes?.email ?? undefined,
      phoneNumber: p.attributes?.phone_number ?? undefined,
      firstName: p.attributes?.first_name ?? undefined,
      lastName: p.attributes?.last_name ?? undefined
    }));

    let nextCursor = extractPaginationCursor(result.links);

    return {
      output: { profiles, nextCursor, hasMore: !!nextCursor },
      message: `Retrieved **${profiles.length}** profiles from ${sourceName}`
    };
  })
  .build();
