import { SlateTool } from 'slates';
import { z } from 'zod';
import { MgmtClient } from '../lib/client';
import { spec } from '../spec';

export let getContentHistory = SlateTool.create(spec, {
  name: 'Get Content History',
  key: 'get_content_history',
  description: `Retrieves the version history and comments for a content item via the Management API. Returns a chronological list of changes and associated comments. Requires OAuth authentication.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contentId: z.number().describe('The content item ID to get history for'),
      includeComments: z
        .boolean()
        .default(false)
        .describe('Also fetch comments associated with the content item'),
      take: z.number().optional().describe('Number of history/comment records to return'),
      skip: z.number().optional().describe('Number of records to skip for pagination'),
      locale: z.string().optional().describe('Locale code override')
    })
  )
  .output(
    z.object({
      history: z.array(z.any()).describe('Array of version history entries'),
      comments: z
        .array(z.any())
        .optional()
        .describe('Array of comments if includeComments was true')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MgmtClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.input.locale || ctx.config.locale,
      region: ctx.auth.region
    });

    let history = await client.getContentHistory(ctx.input.contentId, {
      take: ctx.input.take,
      skip: ctx.input.skip
    });

    let comments: any[] | undefined;
    if (ctx.input.includeComments) {
      comments = await client.getContentComments(ctx.input.contentId, {
        take: ctx.input.take,
        skip: ctx.input.skip
      });
    }

    let historyList = Array.isArray(history) ? history : [];
    let commentList = comments ? (Array.isArray(comments) ? comments : []) : undefined;

    return {
      output: { history: historyList, comments: commentList },
      message: `Retrieved **${historyList.length}** history entries for content item **#${ctx.input.contentId}**${commentList ? ` and **${commentList.length}** comments` : ''}`
    };
  })
  .build();
