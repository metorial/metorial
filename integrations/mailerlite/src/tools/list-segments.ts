import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description: `Retrieves all segments in the account. Segments are rule-based subscriber groupings created in the MailerLite UI. Can optionally fetch subscribers belonging to a specific segment.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      segmentId: z
        .string()
        .optional()
        .describe(
          'Segment ID — if provided, returns subscribers in this segment instead of listing all segments'
        ),
      subscriberStatus: z
        .enum(['active', 'unsubscribed', 'unconfirmed', 'bounced', 'junk'])
        .optional()
        .describe('Filter segment subscribers by status (only when segmentId is provided)'),
      limit: z.number().optional().describe('Number of results per page'),
      page: z.number().optional().describe('Page number'),
      cursor: z.string().optional().describe('Pagination cursor (for segment subscribers)')
    })
  )
  .output(
    z.object({
      segments: z
        .array(
          z.object({
            segmentId: z.string().describe('Segment ID'),
            name: z.string().describe('Segment name'),
            totalCount: z.number().optional().describe('Total subscribers in segment'),
            openRate: z.any().optional().describe('Open rate'),
            clickRate: z.any().optional().describe('Click rate'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of segments (when no segmentId provided)'),
      subscribers: z
        .array(
          z.object({
            subscriberId: z.string().describe('Subscriber ID'),
            email: z.string().describe('Email address'),
            status: z.string().describe('Subscriber status')
          })
        )
        .optional()
        .describe('List of subscribers in the segment (when segmentId provided)'),
      nextCursor: z.string().optional().nullable().describe('Pagination cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.segmentId) {
      let result = await client.getSegmentSubscribers(ctx.input.segmentId, {
        status: ctx.input.subscriberStatus,
        limit: ctx.input.limit,
        cursor: ctx.input.cursor
      });

      let subscribers = (result.data || []).map((s: any) => ({
        subscriberId: s.id,
        email: s.email,
        status: s.status
      }));

      return {
        output: {
          subscribers,
          nextCursor: result.meta?.next_cursor || null
        },
        message: `Retrieved **${subscribers.length}** subscribers from segment **${ctx.input.segmentId}**.`
      };
    }

    let result = await client.listSegments({
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let segments = (result.data || []).map((s: any) => ({
      segmentId: s.id,
      name: s.name,
      totalCount: s.total,
      openRate: s.open_rate,
      clickRate: s.click_rate,
      createdAt: s.created_at
    }));

    return {
      output: { segments },
      message: `Retrieved **${segments.length}** segments.`
    };
  })
  .build();
