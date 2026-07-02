import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let postTranslationSchema = z.object({
  title: z.string().describe('Title text'),
  content: z.string().describe('Plain text content'),
  contentHtml: z.string().describe('HTML content'),
  language: z.string().describe('Language code'),
  category: z.string().describe('Category name'),
  linkUrl: z.string().describe('CTA URL'),
  linkText: z.string().describe('CTA text'),
  images: z.array(z.string()).describe('Image URLs')
});

export let newPostTrigger = SlateTrigger.create(spec, {
  name: 'New Post',
  key: 'new_post',
  description:
    '[Polling fallback] Triggers when a new post is published in Beamer. Detects new changelog entries, feature announcements, bug fixes, and other announcements.'
})
  .input(
    z.object({
      postId: z.number().describe('Post ID'),
      date: z.string().describe('Publication date'),
      published: z.boolean().describe('Whether the post is published'),
      category: z.string().describe('Post category'),
      translations: z.array(z.any()).describe('Post translations'),
      filter: z.string().nullable().describe('Segmentation filter'),
      rawPost: z.any().describe('Full post data')
    })
  )
  .output(
    z.object({
      postId: z.number().describe('Unique post ID'),
      date: z.string().describe('Publication date (ISO-8601)'),
      published: z.boolean().describe('Whether the post is published'),
      pinned: z.boolean().describe('Whether the post is pinned'),
      category: z.string().describe('Post category'),
      translations: z.array(postTranslationSchema).describe('Post content translations'),
      filter: z.string().nullable().describe('Segmentation filter'),
      filterUrl: z.string().nullable().describe('URL segmentation filter'),
      autoOpen: z.boolean().describe('Auto-open on load'),
      feedbackEnabled: z.boolean().describe('Feedback enabled'),
      reactionsEnabled: z.boolean().describe('Reactions enabled')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastPolledDate = (ctx.state as Record<string, unknown>)?.lastPolledDate as
        | string
        | undefined;
      let params: Record<string, unknown> = {
        maxResults: 10,
        published: true
      };

      if (lastPolledDate) {
        params.dateFrom = lastPolledDate;
      }

      let posts = await client.listPosts(params as any);

      let knownIds = ((ctx.state as Record<string, unknown>)?.knownIds as number[]) ?? [];
      let newPosts = posts.filter(p => !knownIds.includes(p.id));

      let updatedKnownIds = [...knownIds, ...newPosts.map(p => p.id)].slice(-100);

      let newLastPolledDate = posts.length > 0 && posts[0] ? posts[0].date : lastPolledDate;

      return {
        inputs: newPosts.map(post => ({
          postId: post.id,
          date: post.date,
          published: post.published,
          category: post.category,
          translations: post.translations ?? [],
          filter: post.filter,
          rawPost: post
        })),
        updatedState: {
          lastPolledDate: newLastPolledDate,
          knownIds: updatedKnownIds
        }
      };
    },
    handleEvent: async ctx => {
      let post = ctx.input.rawPost;

      return {
        type: 'post.created',
        id: String(ctx.input.postId),
        output: {
          postId: post.id,
          date: post.date,
          published: post.published,
          pinned: post.pinned ?? false,
          category: post.category,
          translations: post.translations ?? [],
          filter: post.filter ?? null,
          filterUrl: post.filterUrl ?? null,
          autoOpen: post.autoOpen ?? false,
          feedbackEnabled: post.feedbackEnabled ?? false,
          reactionsEnabled: post.reactionsEnabled ?? false
        }
      };
    }
  })
  .build();
