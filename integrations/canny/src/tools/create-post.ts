import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let createPostTool = SlateTool.create(spec, {
  name: 'Create Post',
  key: 'create_post',
  description: `Create a new feedback post on a board. Posts represent individual feedback items or feature requests. You can assign a category, set custom fields, attach images, set an ETA, and assign an owner.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      authorId: z.string().describe('Canny user ID of the post author'),
      boardId: z.string().describe('Board ID where the post will be created'),
      title: z.string().describe('Title of the post'),
      details: z.string().optional().describe('Body/description of the post'),
      categoryId: z.string().optional().describe('Category ID to assign to the post'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field key-value pairs'),
      eta: z.string().optional().describe('Estimated completion date (ISO 8601)'),
      etaPublic: z.boolean().optional().describe('Whether to show ETA publicly'),
      imageURLs: z.array(z.string()).optional().describe('Array of image URLs to attach'),
      ownerId: z.string().optional().describe('Canny user ID of the post owner/assignee'),
      createdByAdminId: z
        .string()
        .optional()
        .describe('Admin user ID if creating on behalf of someone'),
      createdAt: z.string().optional().describe('Override creation timestamp (ISO 8601)')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('Unique identifier of the created post')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let result = await client.createPost({
      authorID: ctx.input.authorId,
      boardID: ctx.input.boardId,
      title: ctx.input.title,
      details: ctx.input.details,
      categoryID: ctx.input.categoryId,
      customFields: ctx.input.customFields,
      eta: ctx.input.eta,
      etaPublic: ctx.input.etaPublic,
      imageURLs: ctx.input.imageURLs,
      ownerID: ctx.input.ownerId,
      byID: ctx.input.createdByAdminId,
      createdAt: ctx.input.createdAt
    });

    return {
      output: {
        postId: result.id
      },
      message: `Created post **"${ctx.input.title}"** (ID: ${result.id}).`
    };
  })
  .build();
