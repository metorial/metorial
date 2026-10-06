import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let searchImagesTool = SlateTool.create(spec, {
  name: 'Search Images',
  key: 'search_images',
  description: `Search for images within a project using text prompts, visual similarity to an existing image, or by filtering on tags, classes, and batch assignments. Supports pagination for browsing large datasets.`,
  constraints: ['Maximum limit is 250 images per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: projectIdSchema,
      prompt: z
        .string()
        .optional()
        .describe('Text query for semantic/CLIP-based image search'),
      likeImageId: z.string().optional().describe('Image ID to find visually similar images'),
      tag: z.string().optional().describe('Filter images by tag'),
      className: z.string().optional().describe('Filter images by annotation class'),
      inDataset: z
        .boolean()
        .optional()
        .describe('Filter to images in the dataset (true) or not yet added (false)'),
      batchId: z.string().optional().describe('Filter images by batch ID'),
      offset: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Pagination offset (default 0)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(250)
        .optional()
        .describe('Maximum number of results to return (default 100, max 250)')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            imageId: z.string().describe('Unique image identifier'),
            name: z.string().optional().describe('Image filename'),
            labels: z.array(z.string()).optional().describe('Annotation class labels'),
            split: z.string().optional().describe('Dataset split'),
            tags: z.array(z.string()).optional().describe('Image tags'),
            owner: z.string().optional().describe('Image owner/uploader'),
            createdAt: z.number().optional().describe('Unix timestamp of image creation')
          })
        )
        .describe('Matching images'),
      totalResults: z.number().optional().describe('Total number of matching images')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let workspaceId = await client.getWorkspaceId();
    let likeImage: string | undefined;
    if (ctx.input.likeImageId) {
      const data = await client.getImage(
        workspaceId,
        ctx.input.projectId,
        ctx.input.likeImageId
      );
      const image = data.image || data;
      if (typeof image.name !== 'string' || !image.name) {
        throw createApiServiceError(
          'Roboflow did not return a filename for the reference image. Choose an image ID returned by search_images.'
        );
      }
      likeImage = image.name;
    }

    let data = await client.searchImages(workspaceId, ctx.input.projectId, {
      prompt: ctx.input.prompt,
      likeImage,
      tag: ctx.input.tag,
      className: ctx.input.className,
      inDataset: ctx.input.inDataset,
      batchId: ctx.input.batchId,
      batch: ctx.input.batchId ? true : undefined,
      offset: ctx.input.offset ?? 0,
      limit: ctx.input.limit ?? 100,
      fields: ['id', 'name', 'labels', 'split', 'tags', 'owner', 'created']
    });

    let results = (data.results || []).map((r: any) => ({
      imageId: r.id,
      name: r.name,
      labels: r.labels,
      split: r.split,
      tags: r.tags,
      owner: r.owner,
      createdAt: r.created
    }));

    return {
      output: {
        results,
        totalResults: data.total
      },
      message: `Found **${results.length}** image(s) matching the search criteria.`
    };
  })
  .build();
