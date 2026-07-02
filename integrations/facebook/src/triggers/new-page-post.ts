import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newPagePost = SlateTrigger.create(spec, {
  name: 'New Page Post',
  key: 'new_page_post',
  description:
    '[Polling fallback] Polls a Facebook Page for new posts. Triggers whenever a new post is published to the specified Page.'
})
  .input(
    z.object({
      postId: z.string().describe('Post ID'),
      message: z.string().optional().describe('Post message text'),
      story: z.string().optional().describe('Post story text'),
      createdTime: z.string().optional().describe('ISO timestamp when the post was created'),
      fullPicture: z.string().optional().describe('URL of the full-size post image'),
      permalinkUrl: z.string().optional().describe('Permanent URL to the post'),
      type: z.string().optional().describe('Post type'),
      authorId: z.string().optional().describe('Author ID'),
      authorName: z.string().optional().describe('Author name')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('Post ID'),
      message: z.string().optional().describe('Post message text'),
      story: z.string().optional().describe('Post story text'),
      createdTime: z.string().optional().describe('ISO timestamp when the post was created'),
      fullPicture: z.string().optional().describe('URL of the full-size post image'),
      permalinkUrl: z.string().optional().describe('Permanent URL to the post'),
      type: z.string().optional().describe('Post type'),
      authorId: z.string().optional().describe('Author ID'),
      authorName: z.string().optional().describe('Author name'),
      pageId: z.string().describe('Page ID where the post was published')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiVersion: ctx.config.apiVersion
      });

      let state = ctx.state as {
        lastPollTime?: string;
        pageId?: string;
        knownPostIds?: string[];
      } | null;

      // Get managed pages
      let pages = await client.getMyPages('id,access_token');
      if (pages.length === 0) {
        return { inputs: [], updatedState: state || {} };
      }

      let allInputs: Array<{
        postId: string;
        message?: string;
        story?: string;
        createdTime?: string;
        fullPicture?: string;
        permalinkUrl?: string;
        type?: string;
        authorId?: string;
        authorName?: string;
      }> = [];

      let knownPostIds = new Set<string>(state?.knownPostIds || []);
      let newKnownPostIds: string[] = [];

      for (let page of pages) {
        let result = await client.getPagePosts(page.id, { limit: 10 });

        for (let post of result.data) {
          newKnownPostIds.push(post.id);

          if (state && !knownPostIds.has(post.id)) {
            allInputs.push({
              postId: post.id,
              message: post.message,
              story: post.story,
              createdTime: post.created_time,
              fullPicture: post.full_picture,
              permalinkUrl: post.permalink_url,
              type: post.type,
              authorId: post.from?.id,
              authorName: post.from?.name
            });
          }
        }
      }

      return {
        inputs: allInputs,
        updatedState: {
          lastPollTime: new Date().toISOString(),
          knownPostIds: newKnownPostIds.slice(0, 500)
        }
      };
    },

    handleEvent: async ctx => {
      // Determine pageId from the post ID (format: pageId_postId)
      let pageId = ctx.input.postId.split('_')[0] || '';

      return {
        type: 'page_post.created',
        id: ctx.input.postId,
        output: {
          postId: ctx.input.postId,
          message: ctx.input.message,
          story: ctx.input.story,
          createdTime: ctx.input.createdTime,
          fullPicture: ctx.input.fullPicture,
          permalinkUrl: ctx.input.permalinkUrl,
          type: ctx.input.type,
          authorId: ctx.input.authorId,
          authorName: ctx.input.authorName,
          pageId
        }
      };
    }
  })
  .build();
