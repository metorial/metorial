import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, extractPostSummary } from '../lib/helpers';
import { spec } from '../spec';

let postOutputSchema = z.object({
  postId: z.string().describe('Unique identifier of the post'),
  title: z.string().describe('Post title'),
  status: z.string().describe('Post status (draft, publish, pending, private, future)'),
  url: z.string().describe('Public URL of the post'),
  slug: z.string().describe('URL-friendly slug'),
  excerpt: z.string().describe('Short excerpt of the post'),
  date: z.string().describe('Publication date'),
  modifiedDate: z.string().describe('Last modified date'),
  authorName: z.string().describe('Display name of the author'),
  commentCount: z.number().describe('Number of comments'),
  likeCount: z.number().describe('Number of likes'),
  format: z.string().describe('Post format (standard, aside, gallery, etc.)'),
  type: z.string().describe('Content type')
});

export let createPostTool = SlateTool.create(spec, {
  name: 'Create Post',
  key: 'create_post',
  description: `Create a new blog post on the WordPress site. Supports setting title, content, excerpt, status (draft/publish/pending/private), scheduling via date, post format, categories, tags, featured image, and comment settings.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Post title'),
      content: z.string().optional().describe('Post content (HTML)'),
      excerpt: z.string().optional().describe('Short excerpt or summary'),
      status: z
        .enum(['draft', 'publish', 'pending', 'private', 'future'])
        .optional()
        .describe('Post status. Defaults to "draft"'),
      format: z
        .string()
        .optional()
        .describe(
          'Post format (standard, aside, gallery, image, link, quote, status, video, audio, chat)'
        ),
      categories: z
        .array(z.string())
        .optional()
        .describe('Category names (WP.com) or category IDs (self-hosted)'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tag names (WP.com) or tag IDs (self-hosted)'),
      featuredImageId: z.string().optional().describe('Media ID to use as featured image'),
      date: z
        .string()
        .optional()
        .describe(
          'Publication date in ISO 8601 format. Use a future date to schedule the post'
        ),
      slug: z.string().optional().describe('Custom URL slug for the post'),
      password: z.string().optional().describe('Password to protect the post'),
      commentStatus: z
        .enum(['open', 'closed'])
        .optional()
        .describe('Whether comments are open or closed'),
      pingStatus: z
        .enum(['open', 'closed'])
        .optional()
        .describe('Whether pingbacks/trackbacks are open or closed')
    })
  )
  .output(postOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let post = await client.createPost(ctx.input);
    let result = extractPostSummary(post, ctx.config.apiType);
    return {
      output: result,
      message: `Created post **"${result.title}"** with status \`${result.status}\`. [View post](${result.url})`
    };
  })
  .build();

export let updatePostTool = SlateTool.create(spec, {
  name: 'Update Post',
  key: 'update_post',
  description: `Update an existing blog post. Can modify the title, content, excerpt, status, categories, tags, featured image, slug, and other settings. Only provided fields are updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      postId: z.string().describe('ID of the post to update'),
      title: z.string().optional().describe('New post title'),
      content: z.string().optional().describe('New post content (HTML)'),
      excerpt: z.string().optional().describe('New excerpt or summary'),
      status: z
        .enum(['draft', 'publish', 'pending', 'private', 'future'])
        .optional()
        .describe('New post status'),
      format: z.string().optional().describe('New post format'),
      categories: z
        .array(z.string())
        .optional()
        .describe('Category names (WP.com) or category IDs (self-hosted)'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tag names (WP.com) or tag IDs (self-hosted)'),
      featuredImageId: z.string().optional().describe('Media ID for the featured image'),
      date: z.string().optional().describe('New publication date in ISO 8601 format'),
      slug: z.string().optional().describe('New URL slug'),
      password: z.string().optional().describe('Post password'),
      commentStatus: z
        .enum(['open', 'closed'])
        .optional()
        .describe('Whether comments are open or closed'),
      pingStatus: z
        .enum(['open', 'closed'])
        .optional()
        .describe('Whether pingbacks/trackbacks are open or closed')
    })
  )
  .output(postOutputSchema)
  .handleInvocation(async ctx => {
    let { postId, ...updateData } = ctx.input;
    let client = createClient(ctx.config, ctx.auth);
    let post = await client.updatePost(postId, updateData);
    let result = extractPostSummary(post, ctx.config.apiType);
    return {
      output: result,
      message: `Updated post **"${result.title}"** (ID: ${result.postId}). Status: \`${result.status}\`.`
    };
  })
  .build();

export let deletePostTool = SlateTool.create(spec, {
  name: 'Delete Post',
  key: 'delete_post',
  description: `Permanently delete a blog post by its ID. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      postId: z.string().describe('ID of the post to delete')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('ID of the deleted post'),
      deleted: z.boolean().describe('Whether the post was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deletePost(ctx.input.postId);
    return {
      output: {
        postId: ctx.input.postId,
        deleted: true
      },
      message: `Deleted post with ID **${ctx.input.postId}**.`
    };
  })
  .build();
