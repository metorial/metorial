import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve a specific template by its ID. Returns the template's name, dimensions, configurable parameters, and timestamps.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to retrieve')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the template'),
      name: z.string().describe('Name of the template'),
      width: z.number().describe('Width of the template in pixels'),
      height: z.number().describe('Height of the template in pixels'),
      params: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of configurable parameter definitions'),
      createdAt: z.string().describe('Timestamp when the template was created'),
      updatedAt: z.string().describe('Timestamp when the template was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let template = await client.getTemplate(ctx.input.templateId);

    return {
      output: {
        templateId: template._id,
        name: template.name,
        width: template.width,
        height: template.height,
        params: template.params || [],
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      },
      message: `Retrieved template **${template.name}** (${template.width}x${template.height}).`
    };
  })
  .build();
