import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTemplateFields = SlateTool.create(spec, {
  name: 'Get Pass Template Fields',
  key: 'get_template_fields',
  description:
    'Discover the required and optional personalization fields for a template, including their exact API keys, types, and required flags. Use these keys in create_pass or update_pass customFields.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      templateId: z.string().describe('Template identifier from list_templates')
    })
  )
  .output(
    z.object({
      fields: z
        .array(z.record(z.string(), z.any()))
        .describe('Provider field definitions with keys, types, and required flags')
    })
  )
  .handleInvocation(async ctx => {
    let fields = await new Client({ token: ctx.auth.token }).getTemplateFields(
      ctx.input.templateId
    );
    return {
      output: { fields },
      message: `Retrieved **${fields.length}** field definition(s).`
    };
  })
  .build();
