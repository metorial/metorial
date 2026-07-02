import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve all available PDF templates from your CraftMyPDF account. Supports pagination and filtering by group name.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of templates to return per page. Default is 300.'),
      offset: z.number().optional().describe('Number of templates to skip for pagination.'),
      groupName: z.string().optional().describe('Filter templates by group name.')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Unique identifier of the template.'),
            name: z.string().describe('Name of the template.'),
            groupName: z.string().describe('Group name the template belongs to.'),
            createdAt: z.string().describe('Timestamp when the template was created.'),
            updatedAt: z.string().describe('Timestamp when the template was last updated.')
          })
        )
        .describe('List of templates.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listTemplates({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      groupName: ctx.input.groupName
    });

    let templates = (result.templates || []).map(t => ({
      templateId: t.template_id,
      name: t.name,
      groupName: t.group_name || '',
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    return {
      output: { templates },
      message: `Found **${templates.length}** template(s).`
    };
  })
  .build();
