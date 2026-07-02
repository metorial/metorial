import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateSummarySchema = z.object({
  templateId: z.string().describe('Unique ID of the template'),
  title: z.string().optional().describe('Title of the template')
});

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Lists all available contract templates. Returns template IDs and titles, which can be used for creating contracts or managing templates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      templates: z.array(templateSummarySchema).describe('List of available templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Fetching templates...');

    let result = await client.listTemplates();

    let templates = (result?.data || result || []).map((t: any) => ({
      templateId: t.templateId,
      title: t.title
    }));

    return {
      output: { templates },
      message: `Found **${templates.length}** template(s).`
    };
  })
  .build();
