import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Update an existing image template. You can modify the name, dimensions, or configurable parameters.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to update'),
      name: z.string().optional().describe('New name for the template'),
      width: z.number().optional().describe('New width in pixels'),
      height: z.number().optional().describe('New height in pixels'),
      params: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Updated list of configurable parameter definitions')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the updated template'),
      name: z.string().describe('Name of the template'),
      width: z.number().describe('Width of the template in pixels'),
      height: z.number().describe('Height of the template in pixels'),
      createdAt: z.string().describe('Timestamp when the template was created'),
      updatedAt: z.string().describe('Timestamp when the template was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let { templateId, ...updateData } = ctx.input;

    let template = await client.updateTemplate(templateId, updateData);

    return {
      output: {
        templateId: template._id,
        name: template.name,
        width: template.width,
        height: template.height,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      },
      message: `Template **${template.name}** updated successfully.`
    };
  })
  .build();
