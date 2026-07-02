import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List all image templates available in your account. Returns each template's ID, name, dimensions, and timestamps.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('ID of the template'),
            name: z.string().describe('Name of the template'),
            width: z.number().describe('Width of the template in pixels'),
            height: z.number().describe('Height of the template in pixels'),
            createdAt: z.string().describe('Timestamp when the template was created'),
            updatedAt: z.string().describe('Timestamp when the template was last updated')
          })
        )
        .describe('List of templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let templates = await client.listTemplates();

    let mapped = (Array.isArray(templates) ? templates : []).map((template: any) => ({
      templateId: template._id,
      name: template.name,
      width: template.width,
      height: template.height,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    }));

    return {
      output: {
        templates: mapped
      },
      message: `Found **${mapped.length}** template(s).`
    };
  })
  .build();
