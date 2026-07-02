import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updatePost = SlateTool.create(spec, {
  name: 'Update Post',
  key: 'update_post',
  description: `Update an existing single-image post (standard post) in the directory. Only one post can be updated at a time.`,
  constraints: ['Only one post can be updated at a time.']
})
  .input(
    z.object({
      postId: z.string().describe('The post ID to update.'),
      dataId: z.string().describe('The post type (data category) ID.'),
      dataType: z.string().optional().describe('The data type identifier.'),
      postTitle: z.string().optional().describe('Updated title.'),
      postContent: z.string().optional().describe('Updated content.'),
      postStatus: z.string().optional().describe('Updated status.'),
      postImage: z.string().optional().describe('Updated image URL.'),
      postTags: z.string().optional().describe('Updated comma-separated tags.'),
      postLiveDate: z.string().optional().describe('Updated live date (YYYY-MM-DD).'),
      postExpireDate: z.string().optional().describe('Updated expiration date (YYYY-MM-DD).'),
      additionalFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Any additional fields as key-value pairs.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      post: z.any().describe('The updated post record.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let data: Record<string, any> = {
      post_id: ctx.input.postId,
      data_id: ctx.input.dataId
    };

    if (ctx.input.dataType) data.data_type = ctx.input.dataType;
    if (ctx.input.postTitle) data.post_title = ctx.input.postTitle;
    if (ctx.input.postContent) data.post_content = ctx.input.postContent;
    if (ctx.input.postStatus) data.post_status = ctx.input.postStatus;
    if (ctx.input.postImage) data.post_image = ctx.input.postImage;
    if (ctx.input.postTags) data.post_tags = ctx.input.postTags;
    if (ctx.input.postLiveDate) data.post_live_date = ctx.input.postLiveDate;
    if (ctx.input.postExpireDate) data.post_expire_date = ctx.input.postExpireDate;
    if (ctx.input.additionalFields) {
      for (let [key, value] of Object.entries(ctx.input.additionalFields)) {
        data[key] = value;
      }
    }

    let result = await client.updatePost(data);

    return {
      output: {
        status: result.status,
        post: result.message
      },
      message: `Updated post **${ctx.input.postId}**.`
    };
  })
  .build();
