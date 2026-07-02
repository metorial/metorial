import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { RedditClient } from '../lib/client';
import { spec } from '../spec';

export let newPost = SlateTrigger.create(spec, {
  name: 'New Post',
  key: 'new_post',
  description:
    'Triggers when a new post is submitted to one or more subreddits the authenticated user is subscribed to. Polls subreddits for new posts.'
})
  .input(
    z.object({
      postId: z.string().describe('Post fullname'),
      title: z.string().describe('Post title'),
      author: z.string().optional().describe('Post author username'),
      subredditName: z.string().optional().describe('Subreddit where the post was submitted'),
      selftext: z.string().optional().describe('Self text for text posts'),
      linkUrl: z.string().optional().describe('URL for link posts'),
      score: z.number().optional().describe('Post score'),
      numComments: z.number().optional().describe('Number of comments'),
      createdUtc: z.number().optional().describe('Creation timestamp in UTC seconds'),
      permalink: z.string().optional().describe('Permalink to the post'),
      isNsfw: z.boolean().optional().describe('Whether the post is NSFW'),
      isSpoiler: z.boolean().optional().describe('Whether the post is a spoiler'),
      isSelf: z.boolean().optional().describe('Whether this is a text post'),
      flairText: z.string().optional().describe('Post flair text')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('Post fullname'),
      title: z.string().describe('Post title'),
      author: z.string().optional().describe('Post author username'),
      subredditName: z.string().optional().describe('Subreddit name'),
      selftext: z.string().optional().describe('Self text for text posts'),
      linkUrl: z.string().optional().describe('URL for link posts'),
      score: z.number().optional().describe('Post score'),
      numComments: z.number().optional().describe('Number of comments'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      permalink: z.string().optional().describe('Full permalink URL'),
      isNsfw: z.boolean().optional().describe('Whether the post is NSFW'),
      isSpoiler: z.boolean().optional().describe('Whether the post is a spoiler'),
      isSelf: z.boolean().optional().describe('Whether this is a text post'),
      flairText: z.string().optional().describe('Post flair text')
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
        seenPostIds?: string[];
      } | null;
      let isFirstRun = !state?.initialized;
      let lastCreatedUtc = state?.lastCreatedUtc ?? 0;
      let seenPostIds = state?.seenPostIds ?? [];

      // Get subscribed subreddits
      let subsData = await client.getMySubreddits({ limit: 25 });
      let subreddits = subsData?.data?.children ?? [];

      let allInputs: any[] = [];
      let newestCreatedUtc = lastCreatedUtc;
      let nextSeenIds: string[] = [...seenPostIds];

      for (let sub of subreddits) {
        let subredditName = sub.data?.display_name;
        if (!subredditName) continue;

        try {
          let postsData = await client.getSubredditPosts(subredditName, 'new', {
            limit: 10
          });

          let children = postsData?.data?.children ?? [];
          for (let child of children) {
            let d = child.data;
            if (!d?.name) continue;

            let createdUtc = d.created_utc ?? 0;
            if (!nextSeenIds.includes(d.name)) {
              nextSeenIds.push(d.name);
            }

            if (createdUtc <= lastCreatedUtc && seenPostIds.includes(d.name)) continue;
            if (createdUtc < lastCreatedUtc) continue;

            if (!isFirstRun) {
              allInputs.push({
                postId: d.name,
                title: d.title,
                author: d.author,
                subredditName: d.subreddit,
                selftext: d.selftext || undefined,
                linkUrl: d.is_self ? undefined : d.url,
                score: d.score,
                numComments: d.num_comments,
                createdUtc: d.created_utc,
                permalink: d.permalink,
                isNsfw: d.over_18,
                isSpoiler: d.spoiler,
                isSelf: d.is_self,
                flairText: d.link_flair_text || undefined
              });
            }

            if (createdUtc > newestCreatedUtc) {
              newestCreatedUtc = createdUtc;
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
          seenPostIds: nextSeenIds.slice(-200)
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'post.created',
        id: ctx.input.postId,
        output: {
          postId: ctx.input.postId,
          title: ctx.input.title,
          author: ctx.input.author,
          subredditName: ctx.input.subredditName,
          selftext: ctx.input.selftext,
          linkUrl: ctx.input.linkUrl,
          score: ctx.input.score,
          numComments: ctx.input.numComments,
          createdAt: ctx.input.createdUtc
            ? new Date(ctx.input.createdUtc * 1000).toISOString()
            : undefined,
          permalink: ctx.input.permalink
            ? `https://www.reddit.com${ctx.input.permalink}`
            : undefined,
          isNsfw: ctx.input.isNsfw,
          isSpoiler: ctx.input.isSpoiler,
          isSelf: ctx.input.isSelf,
          flairText: ctx.input.flairText
        }
      };
    }
  })
  .build();
