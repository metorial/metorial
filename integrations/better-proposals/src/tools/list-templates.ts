import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieves available proposal templates. Templates serve as the basis for creating new proposals. Supports pagination for accounts with many templates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API'),
      templates: z.array(z.any()).describe('List of available templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTemplates(ctx.input.page);
    let templates = Array.isArray(result.data)
      ? result.data
      : result.data
        ? [result.data]
        : [];

    return {
      output: {
        status: result.status ?? 'success',
        templates
      },
      message: `Retrieved ${templates.length} template(s).`
    };
  })
  .build();
