import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description: `Retrieves a paginated list of all subscriber segments in your Sender account. Segments are dynamic filters that automatically update based on criteria like engagement, behavior, or subscriber attributes.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().default(1).describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      segments: z
        .array(
          z.object({
            segmentId: z.string().describe('Segment ID'),
            name: z.string().describe('Segment name'),
            subscriberCount: z.number().describe('Total subscribers matching the segment'),
            activeSubscribers: z.number().describe('Active subscribers matching the segment'),
            createdAt: z.string().describe('Creation timestamp'),
            modifiedAt: z.string().describe('Last modification timestamp')
          })
        )
        .describe('List of segments'),
      currentPage: z.number().describe('Current page number'),
      lastPage: z.number().describe('Total number of pages'),
      total: z.number().describe('Total number of segments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSegments(ctx.input.page);

    return {
      output: {
        segments: result.data.map(s => ({
          segmentId: s.id,
          name: s.name,
          subscriberCount: s.subscribers,
          activeSubscribers: s.active_subscribers,
          createdAt: s.created,
          modifiedAt: s.modified
        })),
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page,
        total: result.meta.total
      },
      message: `Found **${result.meta.total}** segment(s) (page ${result.meta.current_page}/${result.meta.last_page}).`
    };
  })
  .build();
