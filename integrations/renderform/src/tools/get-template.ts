import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve detailed information about a specific RenderForm template, including its configurable properties and their default values. Use the returned property keys in the "data" field when rendering images.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('The template identifier to retrieve')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Unique template identifier'),
      name: z.string().describe('Template display name'),
      previewUrl: z.string().optional().describe('URL to template preview image'),
      scaleFactor: z.number().optional().describe('Scale factor for rendering'),
      outputFormat: z.string().optional().describe('Default output format'),
      quality: z.number().optional().describe('Output quality setting'),
      width: z.number().optional().describe('Template width in pixels'),
      height: z.number().optional().describe('Template height in pixels'),
      createdBy: z.string().optional().describe('Name of the template creator'),
      tags: z.array(z.string()).optional().describe('Tags assigned to the template'),
      properties: z
        .array(
          z.object({
            key: z
              .string()
              .describe(
                'Combined component ID and property name, used as data key when rendering'
              ),
            type: z.string().describe('Data type of the property'),
            defaultValue: z.string().describe('Default value for the property'),
            componentId: z.string().describe('Component identifier'),
            componentType: z.string().describe('Component type (e.g. TEXT, IMAGE)'),
            property: z.string().describe('Property name (e.g. text, src, color)')
          })
        )
        .optional()
        .describe('List of configurable template properties')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let template = await client.getTemplate(ctx.input.templateId);

    return {
      output: {
        templateId: template.identifier,
        name: template.name,
        previewUrl: template.preview,
        scaleFactor: template.scaleFactor,
        outputFormat: template.outputFormat,
        quality: template.quality,
        width: template.width,
        height: template.height,
        createdBy: template.createdBy,
        tags: template.tags,
        properties: template.properties?.map(p => ({
          key: p.key,
          type: p.type,
          defaultValue: p.defaultValue,
          componentId: p.componentId,
          componentType: p.componentType,
          property: p.property
        }))
      },
      message: `Retrieved template **${template.name}** (\`${template.identifier}\`) with ${template.properties?.length ?? 0} configurable properties.`
    };
  })
  .build();
