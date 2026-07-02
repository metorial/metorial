import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient, extractPostSummary } from '../lib/helpers';
import { spec } from '../spec';

export let postChangesTrigger = SlateTrigger.create(spec, {
  name: 'Post Changes',
  key: 'post_changes',
  description:
    'Triggers when a post is created or updated. Polls for new and modified posts at regular intervals.'
})
  .input(
    z.object({
      eventType: z
        .enum(['created', 'updated'])
        .describe('Whether the post was newly created or updated'),
      postId: z.string().describe('ID of the affected post'),
      title: z.string().describe('Post title'),
      status: z.string().describe('Post status'),
      url: z.string().describe('Post URL'),
      slug: z.string().describe('URL slug'),
      excerpt: z.string().describe('Post excerpt'),
      date: z.string().describe('Publication date'),
      modifiedDate: z.string().describe('Last modified date'),
      authorName: z.string().describe('Author display name'),
      format: z.string().describe('Post format'),
      type: z.string().describe('Content type')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('ID of the affected post'),
      title: z.string().describe('Post title'),
      status: z.string().describe('Post status'),
      url: z.string().describe('Post URL'),
      slug: z.string().describe('URL slug'),
      excerpt: z.string().describe('Post excerpt'),
      date: z.string().describe('Publication date'),
      modifiedDate: z.string().describe('Last modified date'),
      authorName: z.string().describe('Author display name'),
      format: z.string().describe('Post format'),
      type: z.string().describe('Content type')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx.config, ctx.auth);

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let knownPostIds = (ctx.state?.knownPostIds as string[] | undefined) || [];

      let now = new Date().toISOString();

      let params: any = {
        perPage: 50,
        page: 1,
        orderBy: 'modified',
        order: 'DESC'
      };

      if (lastPollTime) {
        params.after = lastPollTime;
      }

      let posts: any[];
      try {
        posts = await client.listPosts({
          ...params,
          status: 'publish,draft,pending,private,future'
        });
      } catch {
        // Fallback if status filtering fails
        posts = await client.listPosts(params);
      }

      let inputs = posts.map((post: any) => {
        let summary = extractPostSummary(post, ctx.config.apiType);
        let isNew = !knownPostIds.includes(summary.postId);
        return {
          eventType: isNew ? ('created' as const) : ('updated' as const),
          ...summary
        };
      });

      let newKnownIds = [...new Set([...knownPostIds, ...inputs.map(i => i.postId)])].slice(
        -500
      ); // Keep last 500 IDs

      return {
        inputs,
        updatedState: {
          lastPollTime: now,
          knownPostIds: newKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `post.${ctx.input.eventType}`,
        id: `post-${ctx.input.postId}-${ctx.input.modifiedDate}`,
        output: {
          postId: ctx.input.postId,
          title: ctx.input.title,
          status: ctx.input.status,
          url: ctx.input.url,
          slug: ctx.input.slug,
          excerpt: ctx.input.excerpt,
          date: ctx.input.date,
          modifiedDate: ctx.input.modifiedDate,
          authorName: ctx.input.authorName,
          format: ctx.input.format,
          type: ctx.input.type
        }
      };
    }
  })
  .build();
