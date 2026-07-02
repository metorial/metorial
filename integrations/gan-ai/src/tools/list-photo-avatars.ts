import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaygroundClient } from '../lib/client';
import { spec } from '../spec';

export let listPhotoAvatars = SlateTool.create(spec, {
  name: 'List Photo Avatars',
  key: 'list_photo_avatars',
  description: `List photo avatars with optional filters, or get details for a specific photo avatar by ID. Supports filtering by title, status, and date range with pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      photoAvatarId: z
        .string()
        .optional()
        .describe('If provided, returns detailed info for this specific photo avatar'),
      title: z.string().optional().describe('Filter by title'),
      status: z
        .array(z.enum(['draft', 'processing', 'published', 'failed', 'deleted']))
        .optional()
        .describe('Filter by status'),
      skip: z.number().optional().describe('Number of records to skip'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of records to return (default 20)'),
      startDatetime: z
        .string()
        .optional()
        .describe('Filter by creation date after this ISO 8601 datetime'),
      endDatetime: z
        .string()
        .optional()
        .describe('Filter by creation date before this ISO 8601 datetime')
    })
  )
  .output(
    z.object({
      total: z.number().optional().describe('Total number of matching photo avatars'),
      photoAvatars: z.array(
        z.object({
          photoAvatarId: z.string().describe('Unique photo avatar identifier'),
          title: z.string().nullable().describe('Display name'),
          baseImage: z.string().nullable().describe('Base image URL'),
          status: z.string().describe('Current status'),
          createdAt: z.string().nullable().describe('ISO 8601 creation timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaygroundClient(ctx.auth.token);

    if (ctx.input.photoAvatarId) {
      let details = await client.getPhotoAvatarDetails(ctx.input.photoAvatarId);
      return {
        output: {
          total: 1,
          photoAvatars: [
            {
              photoAvatarId: details.photo_avatar_id,
              title: details.title,
              baseImage: details.base_image,
              status: details.status,
              createdAt: details.created_at
            }
          ]
        },
        message: `Photo avatar **${details.title || details.photo_avatar_id}** (status: ${details.status}).`
      };
    }

    let result = await client.listPhotoAvatars({
      title: ctx.input.title,
      status: ctx.input.status,
      skip: ctx.input.skip,
      limit: ctx.input.limit,
      startDatetime: ctx.input.startDatetime,
      endDatetime: ctx.input.endDatetime
    });

    return {
      output: {
        total: result.total,
        photoAvatars: result.avatars_list.map(a => ({
          photoAvatarId: a.photo_avatar_id,
          title: a.title,
          baseImage: a.base_image,
          status: a.status,
          createdAt: a.created_at
        }))
      },
      message: `Found **${result.total}** photo avatars.`
    };
  })
  .build();
