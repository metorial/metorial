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
    'Content should be provided as a Wix rich content (Ricos) object in richContent.'
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
      title: z
        .string()
        .optional()
        .describe('Post title (required for create_draft; optional for update_draft)'),
      richContent: z
        .any()
        .optional()
        .describe(
          'Post body as a Wix Ricos rich content object, e.g. {"nodes": [{"type": "PARAGRAPH", "id": "p1", "nodes": [{"type": "TEXT", "id": "", "nodes": [], "textData": {"text": "Hello", "decorations": []}}], "paragraphData": {}}]} (for create_draft/update_draft)'
        ),
      excerpt: z
        .string()
        .optional()
        .describe('Post excerpt/summary (for create_draft/update_draft)'),
      featured: z
        .boolean()
        .optional()
        .describe(
          'Whether the post is featured (for create_draft/update_draft); for list_posts, return only featured posts'
        ),
      categoryIds: z
        .array(z.string())
        .optional()
        .describe(
          'Category IDs to assign (for create_draft/update_draft) or to filter by (for list_posts)'
        ),
      tagIds: z
        .array(z.string())
        .optional()
        .describe(
          'Tag IDs to assign (for create_draft/update_draft) or to filter by (for list_posts)'
        ),
      memberId: z
        .string()
        .optional()
        .describe('Member ID of the post author (required for third-party apps)'),
      language: z
        .string()
        .optional()
        .describe('Post language code, e.g. "en" (for create_draft, or to filter lists)'),
      limit: z.number().optional().describe('Max items to return (default 50, max 100)'),
      offset: z.number().optional().describe('Number of items to skip')
    })
  )
  .output(
    z.object({
      post: z.any().optional().describe('Single post data'),
      postId: z.string().optional().describe('ID of the published post (for publish_draft)'),
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
          limit: ctx.input.limit,
          offset: ctx.input.offset,
          categoryIds: ctx.input.categoryIds,
          tagIds: ctx.input.tagIds,
          featured: ctx.input.featured,
          language: ctx.input.language
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
          limit: ctx.input.limit,
          offset: ctx.input.offset,
          language: ctx.input.language
        });
        let draftPosts = result.draftPosts || [];
        return {
          output: { draftPosts, totalResults: result.metaData?.total },
          message: `Found **${draftPosts.length}** draft posts`
        };
      }
      case 'create_draft': {
        if (!ctx.input.title)
          throw createApiServiceError('title is required for create_draft action');
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
          output: { postId: result.postId },
          message: `Published draft post **${ctx.input.draftPostId}** as live blog post **${result.postId}**`
        };
      }
    }
  })
  .build();
