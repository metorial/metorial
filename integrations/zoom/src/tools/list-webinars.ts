import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

export let listWebinars = SlateTool.create(spec, {
  name: 'List Webinars',
  key: 'list_webinars',
  description: `List all webinars scheduled by a Zoom user. Requires the Webinar add-on. Supports pagination.`,
  constraints: ['Requires a paid Zoom Webinar add-on'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .default('me')
        .describe('User ID or email. Use "me" for the authenticated user'),
      pageSize: z.number().optional().describe('Number of records per page (max 300)'),
      nextPageToken: z.string().optional().describe('Pagination token for next page')
    })
  )
  .output(
    z.object({
      totalRecords: z.number().optional().describe('Total number of webinars'),
      nextPageToken: z.string().optional().describe('Token for next page'),
      webinars: z
        .array(
          z.object({
            webinarId: z.number().describe('Webinar ID'),
            uuid: z.string().optional().describe('Webinar UUID'),
            topic: z.string().describe('Webinar topic'),
            type: z.number().describe('Webinar type'),
            startTime: z.string().optional().describe('Start time'),
            duration: z.number().optional().describe('Duration in minutes'),
            timezone: z.string().optional().describe('Timezone'),
            joinUrl: z.string().optional().describe('Join URL'),
            createdAt: z.string().optional().describe('Creation time')
          })
        )
        .describe('List of webinars')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);
    let result = await client.listWebinars(ctx.input.userId, {
      pageSize: ctx.input.pageSize,
      nextPageToken: ctx.input.nextPageToken
    });

    let webinars = (result.webinars || []).map((w: any) => ({
      webinarId: w.id,
      uuid: w.uuid,
      topic: w.topic,
      type: w.type,
      startTime: w.start_time,
      duration: w.duration,
      timezone: w.timezone,
      joinUrl: w.join_url,
      createdAt: w.created_at
    }));

    return {
      output: {
        totalRecords: result.total_records,
        nextPageToken: result.next_page_token || undefined,
        webinars
      },
      message: `Found **${webinars.length}** webinar(s)${result.total_records ? ` of ${result.total_records} total` : ''}.`
    };
  })
  .build();
