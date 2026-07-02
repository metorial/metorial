import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createPost = SlateTool.create(spec, {
  name: 'Create Post',
  key: 'create_post',
  description: `Create a new single-image post (standard post) in the directory. Supports articles, videos, jobs, events, coupons, audios, and discussions.
Use data type "20" for image posts and "9" for video posts.`,
  instructions: [
    'The dataType determines the post type: use "20" for image posts, "9" for videos.',
    'The dataId must reference a valid post type (data category) ID.'
  ]
})
  .input(
    z.object({
      dataId: z.string().describe('The post type (data category) ID.'),
      userId: z.string().describe('The member ID who owns the post.'),
      dataType: z
        .string()
        .optional()
        .describe(
          'The data type identifier (e.g., "20" for images, "9" for videos). Defaults to "20".'
        ),
      postTitle: z.string().optional().describe('Title of the post.'),
      postContent: z.string().optional().describe('Body content of the post.'),
      postStatus: z
        .string()
        .optional()
        .describe('Status of the post (e.g., "active", "pending").'),
      postImage: z.string().optional().describe('URL of the post image.'),
      autoImageImport: z
        .boolean()
        .optional()
        .describe('Whether to automatically import the image.'),
      postTags: z.string().optional().describe('Comma-separated tags for the post.'),
      postLiveDate: z
        .string()
        .optional()
        .describe('Date when the post goes live (YYYY-MM-DD).'),
      postExpireDate: z
        .string()
        .optional()
        .describe('Date when the post expires (YYYY-MM-DD).'),
      additionalFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Any additional fields as key-value pairs.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      post: z.any().describe('The newly created post record.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let data: Record<string, any> = {
      data_id: ctx.input.dataId,
      user_id: ctx.input.userId,
      data_type: ctx.input.dataType || '20'
    };

    if (ctx.input.postTitle) data.post_title = ctx.input.postTitle;
    if (ctx.input.postContent) data.post_content = ctx.input.postContent;
    if (ctx.input.postStatus) data.post_status = ctx.input.postStatus;
    if (ctx.input.postImage) data.post_image = ctx.input.postImage;
    if (ctx.input.autoImageImport !== undefined)
      data.auto_image_import = ctx.input.autoImageImport ? '1' : '0';
    if (ctx.input.postTags) data.post_tags = ctx.input.postTags;
    if (ctx.input.postLiveDate) data.post_live_date = ctx.input.postLiveDate;
    if (ctx.input.postExpireDate) data.post_expire_date = ctx.input.postExpireDate;
    if (ctx.input.additionalFields) {
      for (let [key, value] of Object.entries(ctx.input.additionalFields)) {
        data[key] = value;
      }
    }

    let result = await client.createPost(data);

    return {
      output: {
        status: result.status,
        post: result.message
      },
      message: `Created post${ctx.input.postTitle ? ` **"${ctx.input.postTitle}"**` : ''}.`
    };
  })
  .build();
