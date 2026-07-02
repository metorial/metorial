import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve templates for check-ins or forms. Templates define the question structure, logic flow, and intro/outro messages. Use this to find a template UUID before creating a check-in.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z.enum(['check-ins', 'forms']).describe('Type of templates to retrieve'),
      systemDefault: z.boolean().optional().describe('Filter to system default templates only')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateUuid: z.string().describe('UUID of the template'),
            name: z.string().describe('Name of the template'),
            isSystemDefault: z
              .boolean()
              .optional()
              .describe('Whether this is a system default template'),
            raw: z.any().describe('Full template object from the API')
          })
        )
        .describe('List of templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let templates = await client.listTemplates({
      type: ctx.input.type,
      systemDefault: ctx.input.systemDefault
    });

    let mapped = templates.map((t: any) => ({
      templateUuid: t.uuid,
      name: t.name,
      isSystemDefault: t.system_default ?? t.is_system_default,
      raw: t
    }));

    return {
      output: { templates: mapped },
      message: `Found **${mapped.length}** ${ctx.input.type} template(s).`
    };
  })
  .build();
