import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { RedditClient } from '../lib/client';
import { spec } from '../spec';

export let newComment = SlateTrigger.create(spec, {
  name: 'New Comment',
  key: 'new_comment',
  description:
    'Triggers when new comments appear on posts in subreddits the authenticated user is subscribed to. Polls recent posts for new comments.'
})
  .input(
    z.object({
      commentId: z.string().describe('Comment fullname'),
      postId: z.string().optional().describe('Parent post fullname'),
      parentId: z.string().optional().describe('Parent comment fullname (if a reply)'),
      author: z.string().optional().describe('Comment author username'),
      body: z.string().optional().describe('Comment body text'),
      subredditName: z.string().optional().describe('Subreddit name'),
      score: z.number().optional().describe('Comment score'),
      createdUtc: z.number().optional().describe('Creation timestamp in UTC seconds'),
      permalink: z.string().optional().describe('Comment permalink'),
      isSubmitter: z.boolean().optional().describe('Whether the commenter is the post author')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('Comment fullname'),
      postId: z.string().optional().describe('Parent post fullname'),
      parentId: z.string().optional().describe('Parent comment or post fullname'),
      author: z.string().optional().describe('Comment author username'),
      body: z.string().optional().describe('Comment body text'),
      subredditName: z.string().optional().describe('Subreddit name'),
      score: z.number().optional().describe('Comment score'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      permalink: z.string().optional().describe('Full permalink URL'),
      isSubmitter: z.boolean().optional().describe('Whether the commenter is the post author'),
      isReply: z.boolean().describe('Whether this is a reply to another comment')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new RedditClient(ctx.auth.token);
      let state = ctx.state as {
        initialized?: boolean;
        lastCreatedUtc?: number;
        seenCommentIds?: string[];
      } | null;
      let isFirstRun = !state?.initialized;
      let lastCreatedUtc = state?.lastCreatedUtc ?? 0;
      let seenCommentIds = state?.seenCommentIds ?? [];

      let subsData = await client.getMySubreddits({ limit: 10 });
      let subreddits = subsData?.data?.children ?? [];

      let allInputs: any[] = [];
      let newestCreatedUtc = lastCreatedUtc;
      let nextSeenIds: string[] = [...seenCommentIds];

      for (let sub of subreddits) {
        let subredditName = sub.data?.display_name;
        if (!subredditName) continue;

        try {
          let postsData = await client.getSubredditPosts(subredditName, 'new', { limit: 5 });
          let posts = postsData?.data?.children ?? [];

          for (let post of posts) {
            let postId = post.data?.name;
            if (!postId) continue;

            try {
              let commentsData = await client.getComments(postId, {
                sort: 'new',
                limit: 10,
                depth: 1
              });
              let commentListing = Array.isArray(commentsData) ? commentsData[1] : null;
              let comments = commentListing?.data?.children ?? [];

              for (let comment of comments) {
                if (comment.kind !== 't1') continue;
                let d = comment.data;
                if (!d?.name) continue;

                let createdUtc = d.created_utc ?? 0;
                if (!nextSeenIds.includes(d.name)) {
                  nextSeenIds.push(d.name);
                }

                if (createdUtc <= lastCreatedUtc && seenCommentIds.includes(d.name)) continue;
                if (createdUtc < lastCreatedUtc) continue;

                if (!isFirstRun) {
                  allInputs.push({
                    commentId: d.name,
                    postId: d.link_id,
                    parentId: d.parent_id,
                    author: d.author,
                    body: d.body,
                    subredditName: d.subreddit,
                    score: d.score,
                    createdUtc: d.created_utc,
                    permalink: d.permalink,
                    isSubmitter: d.is_submitter
                  });
                }

                if (createdUtc > newestCreatedUtc) {
                  newestCreatedUtc = createdUtc;
                }
              }
            } catch {
              // Skip posts we can't read comments from
            }
          }
        } catch {
          // Skip subreddits we can't read
        }
      }

      return {
        inputs: allInputs,
        updatedState: {
          initialized: true,
          lastCreatedUtc: newestCreatedUtc,
          seenCommentIds: nextSeenIds.slice(-500)
        }
      };
    },

    handleEvent: async ctx => {
      let isReply = !!ctx.input.parentId && ctx.input.parentId.startsWith('t1_');

      return {
        type: isReply ? 'comment.reply' : 'comment.created',
        id: ctx.input.commentId,
        output: {
          commentId: ctx.input.commentId,
          postId: ctx.input.postId,
          parentId: ctx.input.parentId,
          author: ctx.input.author,
          body: ctx.input.body,
          subredditName: ctx.input.subredditName,
          score: ctx.input.score,
          createdAt: ctx.input.createdUtc
            ? new Date(ctx.input.createdUtc * 1000).toISOString()
            : undefined,
          permalink: ctx.input.permalink
            ? `https://www.reddit.com${ctx.input.permalink}`
            : undefined,
          isSubmitter: ctx.input.isSubmitter,
          isReply
        }
      };
    }
  })
  .build();
