import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDocAnalyticsTool = SlateTool.create(spec, {
  name: 'Get Doc Analytics',
  key: 'get_doc_analytics',
  description: `Retrieve usage analytics for Coda docs, including views, sessions, copies, and likes. Filter by doc IDs, workspace, date range, or published status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      docIds: z.array(z.string()).optional().describe('Filter to specific doc IDs'),
      workspaceId: z.string().optional().describe('Filter by workspace'),
      sinceDate: z
        .string()
        .optional()
        .describe('Start date for analytics (ISO 8601 format, e.g. "2024-01-01")'),
      untilDate: z.string().optional().describe('End date for analytics (ISO 8601 format)'),
      isPublished: z.boolean().optional().describe('Filter by published status'),
      limit: z.number().optional().describe('Maximum number of results'),
      pageToken: z.string().optional().describe('Token for next page')
    })
  )
  .output(
    z.object({
      analytics: z.array(
        z.object({
          docId: z.string().describe('ID of the doc'),
          docName: z.string().optional().describe('Name of the doc'),
          totalSessions: z.number().optional().describe('Total number of sessions'),
          totalCopies: z.number().optional().describe('Total number of copies'),
          totalLikes: z.number().optional().describe('Total number of likes')
        })
      ),
      nextPageToken: z.string().optional().describe('Token for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listDocAnalytics({
      docIds: ctx.input.docIds?.join(','),
      workspaceId: ctx.input.workspaceId,
      sinceDate: ctx.input.sinceDate,
      untilDate: ctx.input.untilDate,
      isPublished: ctx.input.isPublished,
      limit: ctx.input.limit,
      pageToken: ctx.input.pageToken
    });

    let analytics = (result.items || []).map((item: any) => ({
      docId: item.doc?.id || item.docId,
      docName: item.doc?.name,
      totalSessions: item.totalSessions,
      totalCopies: item.totalCopies,
      totalLikes: item.totalLikes
    }));

    return {
      output: {
        analytics,
        nextPageToken: result.nextPageToken
      },
      message: `Retrieved analytics for **${analytics.length}** doc(s).`
    };
  })
  .build();
