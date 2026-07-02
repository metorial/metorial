import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTaskTemplates = SlateTool.create(spec, {
  name: 'List Task Templates',
  key: 'list_task_templates',
  description: `Retrieve all available task templates from Bonsai. Task templates contain predefined sets of tasks that can be applied to projects using the "Create Tasks From Template" tool.`,
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
            templateId: z.string().describe('Template ID'),
            name: z.string().describe('Template name')
          })
        )
        .describe('List of task templates'),
      totalCount: z.number().describe('Total number of templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let templates = await client.listTaskTemplates();

    return {
      output: {
        templates: templates.map(t => ({
          templateId: t.id,
          name: t.name
        })),
        totalCount: templates.length
      },
      message: `Found **${templates.length}** task templates.`
    };
  })
  .build();
