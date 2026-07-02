import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description: `Create a new reusable image template with a name, dimensions, and configurable parameters.
Templates define the visual layout and dynamic fields for generated images.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the template'),
      width: z
        .number()
        .optional()
        .describe('Width of the template in pixels. Defaults to 1000'),
      height: z
        .number()
        .optional()
        .describe('Height of the template in pixels. Defaults to 1000'),
      params: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of configurable parameter definitions for the template')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the created template'),
      name: z.string().describe('Name of the template'),
      width: z.number().describe('Width of the template in pixels'),
      height: z.number().describe('Height of the template in pixels'),
      createdAt: z.string().describe('Timestamp when the template was created'),
      updatedAt: z.string().describe('Timestamp when the template was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let template = await client.createTemplate({
      name: ctx.input.name,
      width: ctx.input.width,
      height: ctx.input.height,
      params: ctx.input.params
    });

    return {
      output: {
        templateId: template._id,
        name: template.name,
        width: template.width,
        height: template.height,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      },
      message: `Template **${template.name}** created successfully.`
    };
  })
  .build();
