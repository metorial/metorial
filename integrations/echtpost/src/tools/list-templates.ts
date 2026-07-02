import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateSchema = z.object({
  templateId: z.string().describe('Unique template identifier'),
  name: z.string().optional().describe('Template name'),
  content: z.string().optional().describe('Template content / text'),
  previewUrl: z.string().optional().describe('URL to preview the template')
});

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve all available postcard templates from your EchtPost account. Templates are created in the EchtPost web interface and referenced by ID when sending postcards. Use this to find template IDs for scheduling postcard deliveries.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      templates: z.array(templateSchema).describe('List of available postcard templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info('Fetching postcard templates');

    let templates = await client.listTemplates();

    let mapped = (Array.isArray(templates) ? templates : []).map((t: any) => ({
      templateId: t.id?.toString(),
      name: t.best_name || t.name || t.content,
      content: t.content,
      previewUrl: t.preview_url
    }));

    return {
      output: {
        templates: mapped
      },
      message: `Found **${mapped.length}** postcard template(s).`
    };
  })
  .build();
