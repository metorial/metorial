import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getImageTool = SlateTool.create(spec, {
  name: 'Get Image',
  key: 'get_image',
  description: `Get detailed information about a specific image in a project, including its annotations, labels, tags, split assignment, and URLs for the original and thumbnail versions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project URL slug'),
      imageId: z.string().describe('Unique image identifier')
    })
  )
  .output(
    z.object({
      imageId: z.string().describe('Unique image identifier'),
      name: z.string().optional().describe('Image filename'),
      split: z.string().optional().describe('Dataset split (train/valid/test)'),
      labels: z.array(z.string()).optional().describe('List of class labels on the image'),
      tags: z.array(z.string()).optional().describe('List of tags applied to the image'),
      width: z.number().optional().describe('Image width in pixels'),
      height: z.number().optional().describe('Image height in pixels'),
      annotations: z
        .array(
          z.object({
            label: z.string().describe('Class label'),
            x: z.number().optional().describe('Bounding box center X'),
            y: z.number().optional().describe('Bounding box center Y'),
            width: z.number().optional().describe('Bounding box width'),
            height: z.number().optional().describe('Bounding box height')
          })
        )
        .optional()
        .describe('Bounding box annotations on the image'),
      originalUrl: z.string().optional().describe('URL of the original image'),
      thumbnailUrl: z.string().optional().describe('URL of the image thumbnail'),
      createdAt: z.number().optional().describe('Unix timestamp when the image was uploaded')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let workspaceId = await client.getWorkspaceId();
    let data = await client.getImage(workspaceId, ctx.input.projectId, ctx.input.imageId);

    let image = data.image || data;
    let annotation = image.annotation;
    let annotations =
      annotation?.boxes?.map((b: any) => ({
        label: b.label,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height
      })) || [];

    return {
      output: {
        imageId: image.id || ctx.input.imageId,
        name: image.name,
        split: image.split,
        labels: image.labels,
        tags: image.tags,
        width: annotation?.width,
        height: annotation?.height,
        annotations,
        originalUrl: image.urls?.original,
        thumbnailUrl: image.urls?.thumb,
        createdAt: image.created
      },
      message: `Image **${image.name || ctx.input.imageId}** has **${annotations.length}** annotation(s) and is in the **${image.split || 'unassigned'}** split.`
    };
  })
  .build();
