import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createWixClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageBlog = SlateTool.create(spec, {
  name: 'Manage Blog',
  key: 'manage_blog',
  description: `List published posts, create/update draft posts, and publish drafts on a Wix Blog.
Use **action** to specify the operation: \`list_posts\`, \`get_post\`, \`list_drafts\`, \`create_draft\`, \`update_draft\`, or \`publish_draft\`.
Blog posts include title, content (rich text), categories, tags, SEO settings, and cover media.`,
  instructions: [
    'New blog content must be created as a draft first, then published using the "publish_draft" action.',
    'For third-party apps creating drafts, memberId is required.',
    'Content should be provided as rich text.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_posts',
          'get_post',
          'list_drafts',
          'create_draft',
          'update_draft',
          'publish_draft'
        ])
        .describe('Operation to perform'),
      postId: z.string().optional().describe('Post ID (for get_post)'),
      draftPostId: z
        .string()
        .optional()
        .describe('Draft post ID (for update_draft, publish_draft)'),
      title: z.string().optional().describe('Post title (for create_draft/update_draft)'),
      richContent: z
        .any()
        .optional()
        .describe('Rich text content object (for create_draft/update_draft)'),
      excerpt: z
        .string()
        .optional()
        .describe('Post excerpt/summary (for create_draft/update_draft)'),
      featured: z
        .boolean()
        .optional()
        .describe('Whether the post is featured (for create_draft/update_draft)'),
      categoryIds: z
        .array(z.string())
        .optional()
        .describe('Category IDs to assign (for create_draft/update_draft)'),
      tagIds: z
        .array(z.string())
        .optional()
        .describe('Tag IDs to assign (for create_draft/update_draft)'),
      memberId: z
        .string()
        .optional()
        .describe('Member ID of the post author (required for third-party apps)'),
      language: z.string().optional().describe('Post language code, e.g. "en"'),
      limit: z.number().optional().describe('Max items to return (default 50)'),
      offset: z.number().optional().describe('Number of items to skip')
    })
  )
  .output(
    z.object({
      post: z.any().optional().describe('Single post data'),
      draftPost: z.any().optional().describe('Single draft post data'),
      posts: z.array(z.any()).optional().describe('List of posts'),
      draftPosts: z.array(z.any()).optional().describe('List of draft posts'),
      totalResults: z.number().optional().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createWixClient(ctx.auth, ctx.config);

    switch (ctx.input.action) {
      case 'list_posts': {
        let result = await client.listPosts({
          paging: { limit: ctx.input.limit, offset: ctx.input.offset },
          categoryIds: ctx.input.categoryIds,
          featured: ctx.input.featured
        });
        let posts = result.posts || [];
        return {
          output: { posts, totalResults: result.metaData?.total },
          message: `Found **${posts.length}** published blog posts`
        };
      }
      case 'get_post': {
        if (!ctx.input.postId)
          throw createApiServiceError('postId is required for get_post action');
        let result = await client.getPost(ctx.input.postId);
        return {
          output: { post: result.post },
          message: `Retrieved blog post **${result.post?.title || ctx.input.postId}**`
        };
      }
      case 'list_drafts': {
        let result = await client.listDraftPosts({
          paging: { limit: ctx.input.limit, offset: ctx.input.offset }
        });
        let draftPosts = result.draftPosts || [];
        return {
          output: { draftPosts, totalResults: result.metaData?.total },
          message: `Found **${draftPosts.length}** draft posts`
        };
      }
      case 'create_draft': {
        let draftPost: Record<string, any> = {};
        if (ctx.input.title) draftPost.title = ctx.input.title;
        if (ctx.input.richContent) draftPost.richContent = ctx.input.richContent;
        if (ctx.input.excerpt) draftPost.excerpt = ctx.input.excerpt;
        if (ctx.input.featured !== undefined) draftPost.featured = ctx.input.featured;
        if (ctx.input.categoryIds) draftPost.categoryIds = ctx.input.categoryIds;
        if (ctx.input.tagIds) draftPost.tagIds = ctx.input.tagIds;
        if (ctx.input.memberId) draftPost.memberId = ctx.input.memberId;
        if (ctx.input.language) draftPost.language = ctx.input.language;
        let result = await client.createDraftPost(draftPost);
        return {
          output: { draftPost: result.draftPost },
          message: `Created draft post **${result.draftPost?.title}** (ID: ${result.draftPost?.id})`
        };
      }
      case 'update_draft': {
        if (!ctx.input.draftPostId)
          throw createApiServiceError('draftPostId is required for update_draft action');
        let draftPost: Record<string, any> = {};
        if (ctx.input.title) draftPost.title = ctx.input.title;
        if (ctx.input.richContent) draftPost.richContent = ctx.input.richContent;
        if (ctx.input.excerpt) draftPost.excerpt = ctx.input.excerpt;
        if (ctx.input.featured !== undefined) draftPost.featured = ctx.input.featured;
        if (ctx.input.categoryIds) draftPost.categoryIds = ctx.input.categoryIds;
        if (ctx.input.tagIds) draftPost.tagIds = ctx.input.tagIds;
        let result = await client.updateDraftPost(ctx.input.draftPostId, draftPost);
        return {
          output: { draftPost: result.draftPost },
          message: `Updated draft post **${ctx.input.draftPostId}**`
        };
      }
      case 'publish_draft': {
        if (!ctx.input.draftPostId)
          throw createApiServiceError('draftPostId is required for publish_draft action');
        let result = await client.publishDraftPost(ctx.input.draftPostId);
        return {
          output: { post: result.post },
          message: `Published draft post **${ctx.input.draftPostId}** as a live blog post`
        };
      }
    }
  })
  .build();
