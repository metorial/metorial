import { SlateTool } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { spec } from '../spec';

export let managePost = SlateTool.create(spec, {
  name: 'Manage Post',
  key: 'manage_post',
  description: `Create, update, list, or delete blog posts on a fundraising profile. Posts are updates that fundraisers share with their supporters to keep them engaged.`,
  instructions: [
    'To list posts, set action to "list" and provide profileUuid.',
    'To create, set action to "create" and provide campaignUuid and profileUuid.',
    'To update, set action to "update" and provide postUuid.',
    'To delete, set action to "delete" and provide postUuid.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      campaignUuid: z.string().optional().describe('Campaign UUID (required for create)'),
      profileUuid: z
        .string()
        .optional()
        .describe('Profile UUID (required for list and create)'),
      postUuid: z.string().optional().describe('Post UUID (required for update and delete)'),
      title: z.string().optional().describe('Post title'),
      body: z.string().optional().describe('Post body content (HTML supported)'),
      photoUrl: z.string().optional().describe('URL for the post image'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of posts to return (for list action)'),
      offset: z.number().optional().describe('Number of posts to skip (for list action)')
    })
  )
  .output(
    z.object({
      posts: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of posts (for list action)'),
      post: z
        .record(z.string(), z.any())
        .optional()
        .describe('Post object (for create/update actions)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RaiselyClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      if (!ctx.input.profileUuid) {
        throw new Error('profileUuid is required for listing posts');
      }
      let result = await client.listPosts(ctx.input.profileUuid, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      let posts = result.data || [];
      return {
        output: { posts, success: true },
        message: `Found **${posts.length}** post(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.campaignUuid || !ctx.input.profileUuid) {
        throw new Error('campaignUuid and profileUuid are required for creating a post');
      }
      let data: Record<string, any> = {};
      if (ctx.input.title) data.title = ctx.input.title;
      if (ctx.input.body) data.body = ctx.input.body;
      if (ctx.input.photoUrl) data.photoUrl = ctx.input.photoUrl;

      let result = await client.createPost(
        ctx.input.campaignUuid,
        ctx.input.profileUuid,
        data
      );
      let post = result.data || result;
      return {
        output: { post, success: true },
        message: `Created post **${post.title || 'New Post'}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.postUuid) {
        throw new Error('postUuid is required for updating a post');
      }
      let data: Record<string, any> = {};
      if (ctx.input.title) data.title = ctx.input.title;
      if (ctx.input.body) data.body = ctx.input.body;
      if (ctx.input.photoUrl) data.photoUrl = ctx.input.photoUrl;

      let result = await client.updatePost(ctx.input.postUuid, data);
      let post = result.data || result;
      return {
        output: { post, success: true },
        message: `Updated post **${post.title || ctx.input.postUuid}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.postUuid) {
        throw new Error('postUuid is required for deleting a post');
      }
      await client.deletePost(ctx.input.postUuid);
      return {
        output: { success: true },
        message: `Deleted post **${ctx.input.postUuid}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
