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
      systemDefault: z
        .boolean()
        .optional()
        .describe('Filter to system default templates only'),
      page: z.number().optional().describe('Page number, starting at 1'),
      pageSize: z.number().optional().describe('Number of templates per page'),
      renderSpecialVars: z
        .boolean()
        .optional()
        .describe('Render question variable placeholders inline'),
      followupId: z
        .string()
        .optional()
        .describe(
          'Check-in UUID used to render question variables. Use list_checkins to discover check-ins.'
        )
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
        .describe('List of templates'),
      count: z.number().optional().describe('Total number of matching templates'),
      next: z.string().nullable().optional().describe('URL of the next page, or null'),
      previous: z.string().nullable().optional().describe('URL of the previous page, or null')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let result = await client.listTemplates(ctx.input);
    let templates = result?.results ?? result;

    let mapped = templates.map((t: any) => ({
      templateUuid: t.uuid,
      name: t.name,
      isSystemDefault: t.system_default ?? t.is_system_default,
      raw: t
    }));

    return {
      output: {
        templates: mapped,
        count: result?.count,
        next: result?.next,
        previous: result?.previous
      },
      message: `Found **${mapped.length}** ${ctx.input.type} template(s).`
    };
  })
  .build();
