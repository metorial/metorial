import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Update an existing template's properties, layers, tags, or description. Supports partial updates by default. Set **replaceLayers** to true to remove any layers not included in the request.
Also supports adding or removing tags from the template.`,
  instructions: [
    'By default, only specified layers are updated and others are preserved.',
    'To add tags, provide tagsToAdd. To remove tags, provide tagsToRemove. Both can be used in a single call.'
  ]
})
  .input(
    z.object({
      templateId: z.string().describe('Template ID to update'),
      name: z.string().optional().describe('New template name'),
      description: z.string().optional().describe('New template description'),
      width: z.number().optional().describe('New width in pixels (max 5000)'),
      height: z.number().optional().describe('New height in pixels (max 5000)'),
      layers: z.array(z.any()).optional().describe('Layer objects to update or add'),
      pages: z
        .array(z.any())
        .optional()
        .describe('Page objects to update for multi-page templates'),
      replaceLayers: z
        .boolean()
        .optional()
        .describe('When true, removes layers not included in the request'),
      tagsToAdd: z.array(z.string()).optional().describe('Tags to add to the template'),
      tagsToRemove: z.array(z.string()).optional().describe('Tags to remove from the template')
    })
  )
  .output(
    z.object({
      templateId: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      layersCount: z.number().optional(),
      pagesCount: z.number().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { templateId, replaceLayers, tagsToAdd, tagsToRemove, ...updateBody } = ctx.input;

    let result = await client.updateTemplate(templateId, updateBody, replaceLayers);

    // Handle tag operations in parallel
    let tagPromises: Promise<any>[] = [];
    if (tagsToAdd && tagsToAdd.length > 0) {
      tagPromises.push(client.addTemplateTags(templateId, tagsToAdd));
    }
    if (tagsToRemove && tagsToRemove.length > 0) {
      tagPromises.push(client.removeTemplateTags(templateId, tagsToRemove));
    }
    if (tagPromises.length > 0) {
      await Promise.all(tagPromises);
    }

    let parts: any[] = [];
    if (ctx.input.name) parts.push(`name to "${ctx.input.name}"`);
    if (ctx.input.width || ctx.input.height) parts.push('dimensions');
    if (ctx.input.layers) parts.push('layers');
    if (tagsToAdd?.length) parts.push(`added ${tagsToAdd.length} tag(s)`);
    if (tagsToRemove?.length) parts.push(`removed ${tagsToRemove.length} tag(s)`);

    return {
      output: {
        templateId: result.id,
        name: result.name,
        description: result.description,
        width: result.width,
        height: result.height,
        layersCount: result.layersCount,
        pagesCount: result.pagesCount,
        updatedAt: result.updatedAt
      },
      message: `Updated template **${result.name || templateId}**${parts.length ? `: ${parts.join(', ')}` : ''}.`
    };
  })
  .build();
