import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinkedInClient } from '../lib/client';
import { spec } from '../spec';

export let getPostEngagement = SlateTool.create(spec, {
  name: 'Get Post Engagement',
  key: 'get_post_engagement',
  description: `Retrieve engagement metrics for a LinkedIn post, including like count, comment count, share count, and other social action summaries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      postUrn: z.string().describe('URN of the post to get engagement metrics for')
    })
  )
  .output(
    z.object({
      postUrn: z.string().describe('URN of the post'),
      likeCount: z.number().optional().describe('Number of likes/reactions'),
      commentCount: z.number().optional().describe('Number of comments'),
      shareCount: z.number().optional().describe('Number of shares/reposts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinkedInClient({ token: ctx.auth.token });
    let summary = await client.getSocialActionSummary(ctx.input.postUrn);

    return {
      output: {
        postUrn: ctx.input.postUrn,
        likeCount:
          summary.likes?.aggregatedTotalLikes ?? summary.totalShareStatistics?.likeCount,
        commentCount:
          summary.comments?.aggregatedTotalComments ??
          summary.totalShareStatistics?.commentCount,
        shareCount: summary.totalShareStatistics?.shareCount
      },
      message: `Post \`${ctx.input.postUrn}\` has **${summary.likes?.aggregatedTotalLikes ?? 0}** likes, **${summary.comments?.aggregatedTotalComments ?? 0}** comments.`
    };
  })
  .build();
